import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { CategorySlug, LeadTime, RateType } from "@/lib/catalog";

export type Role = "seeker" | "provider" | "admin";
export type BookingFor = "self" | "dependent";

export type Profile = {
  uid: string;
  fullName: string;
  mobile: string;
  email: string;
  role: Role | null;
  bookingFor: BookingFor | null;
  /** Prepaid platform credits in pesos (providers). Non-refundable. */
  credits: number;
  /** Month the accept-allowance counter belongs to, "YYYY-MM" (Asia/Manila). */
  acceptPeriod: string | null;
  /** Accepted bookings this period (free allowance = FREE_MONTHLY_ACCEPTS). */
  acceptCount: number;
  /** Completed jobs ever — drives the trust tier. */
  completedCount: number;
  /** Unique clients who vouched for this provider. */
  vouches: number;
  /** ID-verification state (admin-approved badge; see lib/verifications). */
  verificationStatus: string | null;
  verifiedAt: Date | null;
  verifiedUntil: Date | null;
};

export type Dependent = {
  id: string;
  name: string;
  relationship: string;
  notes: string;
};

function profileRef(uid: string) {
  return getAdminDb().collection("profiles").doc(uid);
}

export async function createProfile(
  uid: string,
  data: { fullName: string; mobile: string; email: string }
) {
  await profileRef(uid).set({
    ...data,
    role: null,
    bookingFor: null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await profileRef(uid).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    uid,
    fullName: data.fullName,
    mobile: data.mobile,
    email: data.email,
    role: data.role ?? null,
    bookingFor: data.bookingFor ?? null,
    credits: typeof data.credits === "number" ? data.credits : 0,
    acceptPeriod: data.acceptPeriod ?? null,
    acceptCount: typeof data.acceptCount === "number" ? data.acceptCount : 0,
    completedCount: typeof data.completedCount === "number" ? data.completedCount : 0,
    vouches: typeof data.vouches === "number" ? data.vouches : 0,
    verificationStatus: data.verificationStatus ?? null,
    verifiedAt: data.verifiedAt instanceof Timestamp ? data.verifiedAt.toDate() : null,
    verifiedUntil: data.verifiedUntil instanceof Timestamp ? data.verifiedUntil.toDate() : null,
  };
}

/** Batch trust lookup for browse pages: uid -> {completedCount, vouches}. */
export type ProviderStats = {
  completedCount: number;
  vouches: number;
  verificationStatus: string | null;
  verifiedUntil: Date | null;
};

export async function getProviderTrust(uids: string[]): Promise<Map<string, ProviderStats>> {
  const uniq = [...new Set(uids)].slice(0, 30);
  const map = new Map<string, ProviderStats>();
  if (uniq.length === 0) return map;
  const db = getAdminDb();
  const snaps = await db.getAll(...uniq.map((id) => db.collection("profiles").doc(id)));
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const d = snap.data()!;
    map.set(snap.id, {
      completedCount: typeof d.completedCount === "number" ? d.completedCount : 0,
      vouches: typeof d.vouches === "number" ? d.vouches : 0,
      verificationStatus: d.verificationStatus ?? null,
      verifiedUntil: d.verifiedUntil instanceof Timestamp ? d.verifiedUntil.toDate() : null,
    });
  }
  return map;
}

/** Admin console: most recent profiles (by signup). */
export async function listProfiles(limit = 50): Promise<Profile[]> {
  const snap = await getAdminDb()
    .collection("profiles")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      fullName: data.fullName ?? "",
      mobile: data.mobile ?? "",
      email: data.email ?? "",
      role: data.role ?? null,
      bookingFor: data.bookingFor ?? null,
      credits: typeof data.credits === "number" ? data.credits : 0,
      acceptPeriod: data.acceptPeriod ?? null,
      acceptCount: typeof data.acceptCount === "number" ? data.acceptCount : 0,
      completedCount: typeof data.completedCount === "number" ? data.completedCount : 0,
      vouches: typeof data.vouches === "number" ? data.vouches : 0,
      verificationStatus: data.verificationStatus ?? null,
      verifiedAt: data.verifiedAt instanceof Timestamp ? data.verifiedAt.toDate() : null,
      verifiedUntil: data.verifiedUntil instanceof Timestamp ? data.verifiedUntil.toDate() : null,
    };
  });
}

export async function updateProfile(
  uid: string,
  data: Partial<Pick<Profile, "role" | "bookingFor">>
) {
  await profileRef(uid).set(data, { merge: true });
}

export async function addDependent(
  uid: string,
  data: { name: string; relationship: string; notes: string }
) {
  await profileRef(uid)
    .collection("dependents")
    .add({ ...data, createdAt: FieldValue.serverTimestamp() });
}

// --- Provider service listings -------------------------------------------------
//
// Listings are denormalized on purpose: each doc carries a snapshot of the
// provider's name and service area so the seeker browse page can render from
// one query without N+1 profile reads.

export type ServiceListing = {
  id: string;
  providerUid: string;
  providerName: string;
  categorySlug: CategorySlug;
  categoryLabel: string;
  /** true when the provider created the service themselves ("My own service") */
  custom: boolean;
  title: string;
  description: string;
  rateType: RateType;
  rateAmount: number;
  negotiable: boolean;
  city: string;
  barangay: string;
  leadTime: LeadTime;
  active: boolean;
  createdAt: Date | null;
};

function listingFromSnap(
  id: string,
  data: FirebaseFirestore.DocumentData
): ServiceListing {
  return {
    id,
    providerUid: data.providerUid,
    providerName: data.providerName,
    categorySlug: data.categorySlug,
    categoryLabel: data.categoryLabel,
    custom: data.custom === true,
    title: data.title,
    description: data.description ?? "",
    rateType: data.rateType,
    rateAmount: Number(data.rateAmount),
    negotiable: data.negotiable !== false,
    city: data.city,
    barangay: data.barangay,
    leadTime: data.leadTime,
    active: data.active !== false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
  };
}

function listingsCollection() {
  return getAdminDb().collection("service_listings");
}

export async function createServiceListing(
  input: ServiceListingInputData
): Promise<string> {
  const ref = await listingsCollection().add({
    ...input,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getProviderServices(uid: string): Promise<ServiceListing[]> {
  const snap = await listingsCollection().where("providerUid", "==", uid).get();
  return snap.docs
    .map((d) => listingFromSnap(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

/**
 * Public browse query. Equality-only filters (no server-side orderBy) so no
 * composite indexes are required; results are sorted in memory — fine at
 * launch scale.
 */
export async function browseServices(
  categorySlug?: string
): Promise<ServiceListing[]> {
  let query: FirebaseFirestore.Query = listingsCollection()
    .where("active", "==", true)
    .limit(200);
  if (categorySlug) {
    query = query.where("categorySlug", "==", categorySlug);
  }
  const snap = await query.get();
  return snap.docs
    .map((d) => listingFromSnap(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function getServiceListing(id: string): Promise<ServiceListing | null> {
  const snap = await listingsCollection().doc(id).get();
  if (!snap.exists) return null;
  return listingFromSnap(snap.id, snap.data()!);
}

export async function setServiceListingActive(id: string, active: boolean) {
  await listingsCollection().doc(id).set({ active }, { merge: true });
}

export type ServiceListingInputData = {
  providerUid: string;
  moderation?: { flagged: boolean; terms: string[]; reviewed: boolean };
  providerName: string;
  categorySlug: CategorySlug;
  categoryLabel: string;
  custom: boolean;
  title: string;
  description: string;
  rateType: RateType;
  rateAmount: number;
  negotiable: boolean;
  city: string;
  barangay: string;
  leadTime: LeadTime;
};

