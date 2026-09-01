import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getServiceListing } from "@/lib/firestore";
import { currentPeriod, decideAcceptCharge, txAddWalletEvent } from "@/lib/wallet";
import { FREE_MONTHLY_ACCEPTS, type RateType } from "@/lib/catalog";

export type BookingStatus = "pending" | "accepted" | "declined" | "cancelled";

export type Booking = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  categoryLabel: string;
  rateAmount: number;
  rateType: RateType;
  providerUid: string;
  providerName: string;
  seekerUid: string;
  seekerName: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
  status: BookingStatus;
  /** Fee actually charged to the provider on accept (0 when free allowance). */
  feeCharged: number;
  createdAt: Date | null;
  decidedAt: Date | null;
};

function bookingsCol() {
  return getAdminDb().collection("bookings");
}

function bookingFromSnap(id: string, data: FirebaseFirestore.DocumentData): Booking {
  return {
    id,
    serviceId: data.serviceId,
    serviceTitle: data.serviceTitle,
    categoryLabel: data.categoryLabel ?? "",
    rateAmount: Number(data.rateAmount),
    rateType: data.rateType,
    providerUid: data.providerUid,
    providerName: data.providerName,
    seekerUid: data.seekerUid,
    seekerName: data.seekerName,
    preferredDate: data.preferredDate,
    preferredTime: data.preferredTime ?? "",
    message: data.message ?? "",
    status: data.status,
    feeCharged: typeof data.feeCharged === "number" ? data.feeCharged : 0,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    decidedAt: data.decidedAt instanceof Timestamp ? data.decidedAt.toDate() : null,
  };
}

function sortNewest(a: Booking, b: Booking) {
  return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
}

export async function createBooking(
  seeker: { uid: string; fullName: string },
  serviceId: string,
  input: { preferredDate: string; preferredTime: string; message: string }
): Promise<{ ok: true } | { error: string }> {
  const service = await getServiceListing(serviceId);
  if (!service || !service.active) {
    return { error: "This service is no longer available." };
  }

  // One pending request per seeker per service keeps the queue clean.
  const dup = await bookingsCol()
    .where("serviceId", "==", serviceId)
    .where("seekerUid", "==", seeker.uid)
    .where("status", "==", "pending")
    .get();
  if (!dup.empty) {
    return { error: "You already have a pending request for this service." };
  }

  await bookingsCol().add({
    serviceId,
    serviceTitle: service.title,
    categoryLabel: service.categoryLabel,
    rateAmount: service.rateAmount,
    rateType: service.rateType,
    providerUid: service.providerUid,
    providerName: service.providerName,
    seekerUid: seeker.uid,
    seekerName: seeker.fullName,
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime,
    message: input.message,
    status: "pending",
    feeCharged: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true as const };
}

export async function listSeekerBookings(uid: string): Promise<Booking[]> {
  const snap = await bookingsCol()
    .where("seekerUid", "==", uid)
    .limit(100)
    .get();
  return snap.docs.map((d) => bookingFromSnap(d.id, d.data())).sort(sortNewest);
}

export async function listProviderBookings(uid: string): Promise<Booking[]> {
  const snap = await bookingsCol()
    .where("providerUid", "==", uid)
    .limit(100)
    .get();
  return snap.docs.map((d) => bookingFromSnap(d.id, d.data())).sort(sortNewest);
}

/**
 * Provider accepts a booking. Runs in a single Firestore transaction that:
 *   1. re-checks the booking is pending and theirs,
 *   2. rolls the monthly allowance period forward if needed,
 *   3. charges nothing within the free allowance, or debits the accept fee
 *      from credits beyond it (blocking when the balance is too low),
 *   4. appends the ledger event and marks the booking accepted.
 * The balance can never go negative or double-spend — the transaction
 * re-reads profile state at commit time.
 */
export async function acceptBooking(
  providerUid: string,
  bookingId: string
): Promise<{ ok: true; fee: number } | { error: string }> {
  const db = getAdminDb();
  const bookingRef = bookingsCol().doc(bookingId);
  const profileRef = db.collection("profiles").doc(providerUid);

  return db.runTransaction(async (tx) => {
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists) return { error: "Booking not found." };
    const booking = bookingFromSnap(bookingId, bookingSnap.data()!);
    if (booking.providerUid !== providerUid) {
      return { error: "This booking is not yours to accept." };
    }
    if (booking.status !== "pending") {
      return { error: "This booking is no longer pending." };
    }

    const profileSnap = await tx.get(profileRef);
    const data = profileSnap.exists ? profileSnap.data()! : {};
    const profile = {
      uid: providerUid,
      fullName: data.fullName ?? "",
      mobile: data.mobile ?? "",
      email: data.email ?? "",
      role: data.role ?? null,
      bookingFor: data.bookingFor ?? null,
      credits: typeof data.credits === "number" ? data.credits : 0,
      acceptPeriod: data.acceptPeriod ?? null,
      acceptCount: typeof data.acceptCount === "number" ? data.acceptCount : 0,
    };

    const period = currentPeriod();
    const charge = decideAcceptCharge(profile, period);
    if ("blocked" in charge) return { error: charge.blocked };

    const used = profile.acceptPeriod === period ? profile.acceptCount : 0;
    const newCount = used + 1;

    const profileUpdates: Record<string, unknown> = {
      acceptPeriod: period,
      acceptCount: newCount,
    };
    let balanceAfter = profile.credits;
    if (!charge.free) {
      balanceAfter = profile.credits - charge.fee;
      profileUpdates.credits = balanceAfter;
    }
    tx.update(profileRef, profileUpdates);

    txAddWalletEvent(tx, providerUid, {
      type: charge.free ? "free_accept" : "accept_fee",
      amount: charge.free ? 0 : -charge.fee,
      balanceAfter,
      bookingId,
      note: charge.free
        ? `Free accept #${newCount} of ${FREE_MONTHLY_ACCEPTS} this month`
        : `Accept fee (beyond ${FREE_MONTHLY_ACCEPTS} free monthly accepts)`,
      actor: providerUid,
    });

    tx.update(bookingRef, {
      status: "accepted",
      decidedAt: FieldValue.serverTimestamp(),
      feeCharged: charge.fee,
    });

    return { ok: true as const, fee: charge.fee };
  }).catch(() => ({ error: "Could not accept the booking. Please try again." }));
}

export async function declineBooking(
  providerUid: string,
  bookingId: string
): Promise<{ ok: true } | { error: string }> {
  const ref = bookingsCol().doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Booking not found." };
  const booking = bookingFromSnap(bookingId, snap.data()!);
  if (booking.providerUid !== providerUid) {
    return { error: "This booking is not yours to decline." };
  }
  if (booking.status !== "pending") return { error: "This booking is no longer pending." };
  await ref.update({
    status: "declined",
    decidedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true as const };
}

export async function cancelBooking(
  seekerUid: string,
  bookingId: string
): Promise<{ ok: true } | { error: string }> {
  const ref = bookingsCol().doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Booking not found." };
  const booking = bookingFromSnap(bookingId, snap.data()!);
  if (booking.seekerUid !== seekerUid) {
    return { error: "This booking is not yours to cancel." };
  }
  if (booking.status !== "pending") {
    return { error: "Only pending requests can be cancelled here — contact your provider directly." };
  }
  await ref.update({ status: "cancelled" });
  return { ok: true as const };
}
