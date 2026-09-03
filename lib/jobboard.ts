import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCategory, type CategorySlug } from "@/lib/catalog";

// Reverse job board: seekers post needs (even unlisted services), verified
// providers make priced offers, double handshake -> normal booking.
//   offer pending -> seeker accepts (offer "selected", post "matched",
//   booking PENDING) -> provider confirms via the EXISTING accept flow
//   (fee/allowance/ledger) -> booking accepted, post "filled".

export const JOB_BOARD_MAX_OPEN_POSTS = 3;
export const JOB_BOARD_POST_TTL_DAYS = 14;

export type JobPostStatus = "open" | "matched" | "filled" | "closed";
export type JobOfferStatus = "pending" | "selected" | "accepted" | "declined" | "withdrawn";

export type JobPost = {
  id: string;
  seekerUid: string;
  seekerName: string;
  bookingFor: string | null;
  title: string;
  description: string;
  categorySlug: CategorySlug;
  custom: boolean;
  needsPro: boolean;
  barangay: string;
  city: string;
  whenNeeded: string; // ISO date or "flexible"
  budget: number | null; // null = open to quotes
  status: JobPostStatus;
  acceptedOfferId: string | null;
  filledBookingId: string | null;
  createdAt: Date | null;
};

export type JobOffer = {
  id: string;
  postId: string;
  providerUid: string;
  providerName: string;
  amount: number;
  message: string;
  status: JobOfferStatus;
  createdAt: Date | null;
};

function postsCol() {
  return getAdminDb().collection("job_posts");
}

export function offerId(postId: string, providerUid: string) {
  return `${postId}__${providerUid}`;
}

function postFromSnap(id: string, d: FirebaseFirestore.DocumentData): JobPost {
  return {
    id,
    seekerUid: d.seekerUid,
    seekerName: d.seekerName ?? "",
    bookingFor: d.bookingFor ?? null,
    title: d.title,
    description: d.description ?? "",
    categorySlug: d.categorySlug,
    needsPro: d.needsPro === true,
    custom: d.custom === true,
    barangay: d.barangay,
    city: d.city,
    whenNeeded: d.whenNeeded ?? "flexible",
    budget: typeof d.budget === "number" ? d.budget : null,
    status: d.status ?? "open",
    acceptedOfferId: d.acceptedOfferId ?? null,
    filledBookingId: d.filledBookingId ?? null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
  };
}

function offerFromSnap(id: string, d: FirebaseFirestore.DocumentData): JobOffer {
  return {
    id,
    postId: d.postId,
    providerUid: d.providerUid,
    providerName: d.providerName ?? "",
    amount: Number(d.amount),
    message: d.message ?? "",
    status: d.status ?? "pending",
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
  };
}

function isFresh(post: JobPost) {
  if (!post.createdAt) return true;
  return Date.now() - post.createdAt.getTime() < JOB_BOARD_POST_TTL_DAYS * 24 * 3600 * 1000;
}

// --- Posts -----------------------------------------------------------------------

export async function createJobPost(input: {
  seekerUid: string;
  seekerName: string;
  bookingFor: string | null;
  title: string;
  description: string;
  categorySlug: CategorySlug;
  needsPro?: boolean;
  moderation?: { flagged: boolean; terms: string[]; reviewed: boolean };
  barangay: string;
  city: string;
  whenNeeded: string;
  budget: number | null;
}): Promise<{ ok: true; id?: string } | { error: string }> {
  const mine = await listMyJobPosts(input.seekerUid);
  const openCount = mine.filter((p) => p.status === "open" && isFresh(p)).length;
  if (openCount >= JOB_BOARD_MAX_OPEN_POSTS) {
    return {
      error: `You can have ${JOB_BOARD_MAX_OPEN_POSTS} open requests at a time — close one first.`,
    };
  }
  const ref = await postsCol().add({
    ...input,
    custom: input.categorySlug === "other",
    needsPro: input.needsPro ?? false,
    status: "open",
    acceptedOfferId: null,
    filledBookingId: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true as const, id: ref.id };
}

export async function getJobPost(id: string): Promise<JobPost | null> {
  const snap = await postsCol().doc(id).get();
  return snap.exists ? postFromSnap(id, snap.data()!) : null;
}

export async function listMyJobPosts(uid: string): Promise<JobPost[]> {
  const snap = await postsCol().where("seekerUid", "==", uid).limit(50).get();
  return snap.docs
    .map((d) => postFromSnap(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

/** Board: fresh open posts (age-filtered in memory — no composite index). */
export async function listOpenJobPosts(categorySlug?: string): Promise<JobPost[]> {
  let q: FirebaseFirestore.Query = postsCol().where("status", "==", "open").limit(100);
  if (categorySlug) q = q.where("categorySlug", "==", categorySlug);
  const snap = await q.get();
  return snap.docs
    .map((d) => postFromSnap(d.id, d.data()))
    .filter(isFresh)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function closeJobPost(uid: string, postId: string) {
  const ref = postsCol().doc(postId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Post not found." } as const;
  const post = postFromSnap(postId, snap.data() ?? {});
  if (post.seekerUid !== uid) return { error: "Not your post." } as const;
  if (post.status !== "open") return { error: "Only open posts can be closed." } as const;
  await ref.update({ status: "closed" });
  return { ok: true as const };
}

// --- Offers ----------------------------------------------------------------------

export async function makeOffer(input: {
  postId: string;
  providerUid: string;
  providerName: string;
  amount: number;
  message: string;
  moderation?: { flagged: boolean; terms: string[]; reviewed: boolean };
}): Promise<{ ok: true } | { error: string }> {
  const db = getAdminDb();
  const offerRef = db.collection("job_offers").doc(offerId(input.postId, input.providerUid));
  const postRef = postsCol().doc(input.postId);

  return db
    .runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) return { error: "This post no longer exists." };
      const post = postFromSnap(input.postId, postSnap.data() ?? {});
      if (post.status !== "open" || !isFresh(post)) {
        return { error: "This post is no longer open to offers." };
      }
      const dupe = await tx.get(offerRef);
      if (dupe.exists && dupe.data()?.status !== "withdrawn") {
        return { error: "You already made an offer on this post." };
      }
      tx.set(offerRef, {
        postId: input.postId,
        providerUid: input.providerUid,
        providerName: input.providerName,
        amount: input.amount,
        message: input.message,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
      return { ok: true as const };
    })
    .catch(() => ({ error: "Could not submit your offer. Please try again." }));
}

export async function withdrawOffer(providerUid: string, postId: string) {
  const ref = getAdminDb().collection("job_offers").doc(offerId(postId, providerUid));
  const snap = await ref.get();
  if (!snap.exists) return { error: "Offer not found." } as const;
  const offerData = snap.data()!;
  if (offerData.status !== "pending") return { error: "Only pending offers can be withdrawn." } as const;
  await ref.update({ status: "withdrawn" });
  return { ok: true as const };
}

export async function listMyOffers(providerUid: string): Promise<JobOffer[]> {
  const snap = await getAdminDb()
    .collection("job_offers")
    .where("providerUid", "==", providerUid)
    .limit(50)
    .get();
  return snap.docs
    .map((d) => offerFromSnap(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

/** All offers for one post (seeker view). */
export async function listPostOffers(postId: string): Promise<JobOffer[]> {
  const snap = await getAdminDb()
    .collection("job_offers")
    .where("postId", "==", postId)
    .limit(30)
    .get();
  return snap.docs
    .map((d) => offerFromSnap(d.id, d.data()))
    .sort((a, b) => a.amount - b.amount);
}

/**
 * Seeker accepts an offer — first half of the double handshake. Creates a
 * PENDING booking the provider confirms via the normal accept flow (where
 * the fee is charged). No fees move here.
 */
export async function acceptOffer(input: {
  seekerUid: string;
  postId: string;
  providerUid: string;
}): Promise<{ ok: true } | { error: string }> {
  const db = getAdminDb();
  const postRef = postsCol().doc(input.postId);
  const offerRef = db.collection("job_offers").doc(offerId(input.postId, input.providerUid));

  return db
    .runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) return { error: "Post not found." };
      const post = postFromSnap(input.postId, postSnap.data() ?? {});
      if (post.seekerUid !== input.seekerUid) return { error: "Not your post." };
      if (post.status !== "open") return { error: "This post is no longer open." };

      const offerSnap = await tx.get(offerRef);
      if (!offerSnap.exists) return { error: "Offer not found." };
      const offer = offerFromSnap(offerRef.id, offerSnap.data() ?? {});
      if (offer.status !== "pending") return { error: "This offer is no longer available." };

      const bookingRef = db.collection("bookings").doc();
      tx.set(bookingRef, {
        serviceId: `job_${input.postId}`,
        serviceTitle: post.title,
        categoryLabel:
          post.categorySlug === "other"
            ? "Job board"
            : (getCategory(post.categorySlug)?.label ?? post.categorySlug),
        rateAmount: offer.amount,
        rateType: "per_job",
        providerUid: offer.providerUid,
        providerName: offer.providerName,
        seekerUid: post.seekerUid,
        seekerName: post.seekerName,
        preferredDate: post.whenNeeded,
        preferredTime: "",
        message: offer.message,
        status: "pending",
        feeCharged: 0,
        source: "job_board",
        postId: input.postId,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(offerRef, { status: "selected" });
      tx.update(postRef, {
        status: "matched",
        acceptedOfferId: offerRef.id,
        filledBookingId: bookingRef.id,
      });

      // Politely decline the other offers in the same transaction.
      const others = await db
        .collection("job_offers")
        .where("postId", "==", input.postId)
        .get();
      for (const doc of others.docs) {
        if (doc.id !== offerRef.id && doc.data()?.status === "pending") {
          tx.update(doc.ref, { status: "declined" });
        }
      }
      return { ok: true as const };
    })
    .catch(() => ({ error: "Could not accept that offer. Please try again." }));
}

/** Called from the booking flows: when a matched booking is declined or
 *  cancelled before provider confirmation, reopen the post. */
export async function reopenPostForBooking(bookingId: string) {
  const snap = await postsCol().where("filledBookingId", "==", bookingId).limit(1).get();
  if (snap.empty) return;
  const ref = snap.docs[0].ref;
  const post = postFromSnap(snap.docs[0].id, snap.docs[0].data());
  if (post.status !== "matched") return;
  const batch = getAdminDb().batch();
  batch.update(ref, { status: "open", acceptedOfferId: null, filledBookingId: null });
  if (post.acceptedOfferId) {
    batch.update(
      getAdminDb().collection("job_offers").doc(post.acceptedOfferId),
      { status: "declined" }
    );
  }
  await batch.commit();
}
