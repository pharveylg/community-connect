import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { type CategorySlug } from "@/lib/catalog";

// Trabaho — local employment classifieds. Households and small businesses
// post vacancies; workers express interest; contact numbers are revealed only
// on mutual action (poster shortlists). CC is a listings venue, NOT a
// recruitment agency: no fees from workers ever (scam/illegal-recruitment
// line), no matching engine, wages entirely employer↔worker.
// Ads are listing-only: no booking, no fee event, no handshake machinery.
// Posting requires an ID-verified account (gate lives in the action; job_ads
// only ever contains verified posters at write time).

export type PosterType = "household" | "business";
export type EmploymentType = "full_time" | "part_time" | "contract";
export type SalaryPeriod = "day" | "week" | "month";
export type JobAdStatus = "open" | "filled" | "closed";
export type AdInterestStatus = "interested" | "shortlisted" | "passed" | "withdrawn";

export const TRABAHO_AD_TTL_DAYS = 30;
export const TRABAHO_MAX_OPEN_ADS = 2;

export type JobAd = {
  id: string;
  posterUid: string;
  posterName: string;
  posterType: PosterType;
  title: string;
  description: string;
  categorySlug: CategorySlug;
  employmentType: EmploymentType;
  schedule: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  barangay: string;
  city: string;
  status: JobAdStatus;
  removedByModeration: boolean;
  createdAt: Date | null;
};

export type JobAdInterest = {
  id: string; // `${adId}__${workerUid}`
  adId: string;
  workerUid: string;
  workerName: string;
  message: string;
  status: AdInterestStatus;
  /** Set when the poster shortlists: both mobile numbers are exchanged. */
  posterMobile: string | null;
  workerMobile: string | null;
  shortlistedAt: Date | null;
  createdAt: Date | null;
};

function adsCol() {
  return getAdminDb().collection("job_ads");
}
function interestsCol() {
  return getAdminDb().collection("job_ad_interests");
}

function adFromSnap(id: string, d: FirebaseFirestore.DocumentData): JobAd {
  return {
    id,
    posterUid: d.posterUid,
    posterName: d.posterName,
    posterType: d.posterType === "business" ? "business" : "household",
    title: d.title,
    description: d.description ?? "",
    categorySlug: d.categorySlug,
    employmentType: d.employmentType ?? "full_time",
    schedule: d.schedule ?? "",
    salaryMin: d.salaryMin == null ? null : Number(d.salaryMin),
    salaryMax: d.salaryMax == null ? null : Number(d.salaryMax),
    salaryPeriod: d.salaryPeriod ?? null,
    barangay: d.barangay,
    city: d.city,
    status: d.status === "filled" ? "filled" : d.status === "closed" ? "closed" : "open",
    removedByModeration: d.moderation?.hiddenAt != null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
  };
}

function interestFromSnap(id: string, d: FirebaseFirestore.DocumentData): JobAdInterest {
  return {
    id,
    adId: d.adId,
    workerUid: d.workerUid,
    workerName: d.workerName,
    message: d.message ?? "",
    status: d.status ?? "interested",
    posterMobile: d.posterMobile ?? null,
    workerMobile: d.workerMobile ?? null,
    shortlistedAt: d.shortlistedAt instanceof Timestamp ? d.shortlistedAt.toDate() : null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
  };
}

function isFresh(ad: JobAd): boolean {
  if (!ad.createdAt) return true;
  return Date.now() - ad.createdAt.getTime() < TRABAHO_AD_TTL_DAYS * 86400000;
}

/** Open to interests = status open AND inside the 30-day window. */
export function adIsOpen(ad: JobAd): boolean {
  return ad.status === "open" && isFresh(ad);
}

export function salaryLine(ad: JobAd): string | null {
  if (ad.salaryMin == null) return null;
  const period = ad.salaryPeriod ? `/${ad.salaryPeriod}` : "";
  if (ad.salaryMax != null && ad.salaryMax !== ad.salaryMin) {
    return `₱${ad.salaryMin.toLocaleString("en-PH")}–₱${ad.salaryMax.toLocaleString("en-PH")}${period}`;
  }
  return `₱${ad.salaryMin.toLocaleString("en-PH")}${period}`;
}

export type CreateJobAdInput = {
  posterUid: string;
  posterName: string;
  posterType: PosterType;
  title: string;
  description: string;
  categorySlug: CategorySlug;
  employmentType: EmploymentType;
  schedule: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  barangay: string;
  city: string;
  moderation?: { flagged: boolean; terms: string[]; reviewed: boolean };
};

export async function createJobAd(
  input: CreateJobAdInput
): Promise<{ ok: true; id: string } | { error: string }> {
  const mine = await adsCol().where("posterUid", "==", input.posterUid).get();
  const myAds = mine.docs.map((d) => adFromSnap(d.id, d.data()));
  const openCount = myAds.filter((a) => adIsOpen(a)).length;
  if (openCount >= TRABAHO_MAX_OPEN_ADS) {
    return {
      error: `You can have ${TRABAHO_MAX_OPEN_ADS} open job ads at a time — fill or close one first.`,
    };
  }
  const ref = await adsCol().add({
    ...input,
    status: "open",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true as const, id: ref.id };
}

export async function listOpenAds(categorySlug?: string): Promise<JobAd[]> {
  let q: FirebaseFirestore.Query = adsCol().where("status", "==", "open").limit(100);
  if (categorySlug) q = q.where("categorySlug", "==", categorySlug);
  const snap = await q.get();
  return snap.docs
    .map((d) => adFromSnap(d.id, d.data()))
    .filter(isFresh)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function getJobAd(id: string): Promise<JobAd | null> {
  const snap = await adsCol().doc(id).get();
  return snap.exists ? adFromSnap(id, snap.data() ?? {}) : null;
}

export async function listMyAds(uid: string): Promise<JobAd[]> {
  const snap = await adsCol().where("posterUid", "==", uid).limit(50).get();
  return snap.docs
    .map((d) => adFromSnap(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function setAdStatus(
  uid: string,
  adId: string,
  status: "filled" | "closed"
): Promise<{ ok: true } | { error: string }> {
  const ref = adsCol().doc(adId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Ad not found." } as const;
  const ad = adFromSnap(adId, snap.data() ?? {});
  if (ad.posterUid !== uid) return { error: "Not your ad." } as const;
  if (ad.status !== "open") return { error: "Only open ads can be filled or closed." } as const;
  await ref.update({ status });
  return { ok: true as const };
}

export async function getInterest(
  adId: string,
  workerUid: string
): Promise<JobAdInterest | null> {
  const snap = await interestsCol().doc(`${adId}__${workerUid}`).get();
  return snap.exists ? interestFromSnap(snap.id, snap.data() ?? {}) : null;
}

export async function upsertInterest(
  ad: JobAd,
  worker: { uid: string; name: string },
  message: string,
  moderation?: { flagged: boolean; terms: string[]; reviewed: boolean }
): Promise<{ ok: true } | { error: string }> {
  if (ad.posterUid === worker.uid) {
    return { error: "This is your own ad." } as const;
  }
  if (!adIsOpen(ad)) {
    return { error: "This job ad is no longer open." } as const;
  }
  const ref = interestsCol().doc(`${ad.id}__${worker.uid}`);
  const snap = await ref.get();
  if (snap.exists) {
    const existing = interestFromSnap(snap.id, snap.data() ?? {});
    if (existing.status === "interested" || existing.status === "shortlisted") {
      return { error: "You already expressed interest in this job." } as const;
    }
  }
  await ref.set({
    adId: ad.id,
    workerUid: worker.uid,
    workerName: worker.name,
    message,
    status: "interested",
    posterMobile: null,
    workerMobile: null,
    shortlistedAt: null,
    ...(moderation ? { moderation } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true as const };
}

export async function withdrawInterest(
  adId: string,
  workerUid: string
): Promise<{ ok: true } | { error: string }> {
  const ref = interestsCol().doc(`${adId}__${workerUid}`);
  const snap = await ref.get();
  if (!snap.exists) return { error: "No interest to withdraw." } as const;
  const existing = interestFromSnap(snap.id, snap.data() ?? {});
  if (existing.status === "withdrawn") return { error: "Already withdrawn." } as const;
  await ref.update({ status: "withdrawn" });
  return { ok: true as const };
}

/** Poster decision on an interested worker. Shortlisting exchanges mobile numbers. */
export async function decideInterest(
  adId: string,
  posterUid: string,
  workerUid: string,
  decision: "shortlisted" | "passed",
  contacts: { posterMobile: string; workerMobile: string }
): Promise<{ ok: true } | { error: string }> {
  const adSnap = await adsCol().doc(adId).get();
  if (!adSnap.exists) return { error: "Ad not found." } as const;
  const ad = adFromSnap(adId, adSnap.data() ?? {});
  if (ad.posterUid !== posterUid) return { error: "Not your ad." } as const;

  const ref = interestsCol().doc(`${adId}__${workerUid}`);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Interest not found." } as const;
  const interest = interestFromSnap(snap.id, snap.data() ?? {});
  if (interest.status !== "interested") {
    return { error: "This worker was already handled." } as const;
  }
  await ref.update({
    status: decision,
    ...(decision === "shortlisted"
      ? {
          posterMobile: contacts.posterMobile,
          workerMobile: contacts.workerMobile,
          shortlistedAt: FieldValue.serverTimestamp(),
        }
      : {}),
  });
  return { ok: true as const };
}

export async function listAdInterests(adId: string): Promise<JobAdInterest[]> {
  const snap = await interestsCol().where("adId", "==", adId).limit(100).get();
  return snap.docs
    .map((d) => interestFromSnap(d.id, d.data() ?? {}))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function listMyInterests(uid: string): Promise<JobAdInterest[]> {
  const snap = await interestsCol().where("workerUid", "==", uid).limit(50).get();
  return snap.docs
    .map((d) => interestFromSnap(d.id, d.data() ?? {}))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

