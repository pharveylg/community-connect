import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { VerificationIdType, VerificationStatus } from "@/lib/catalog";
import { VERIFICATION_VALIDITY_DAYS } from "@/lib/catalog";

// ID verification: providers submit ID photos + details, an admin reviews,
// approval grants the ✅ badge for one year. Documents are purged the moment
// a decision is made (privacy: only decision metadata survives).

export type VerificationRequest = {
  id: string;
  uid: string;
  requesterName: string;
  legalName: string;
  idType: VerificationIdType;
  idNumberLast4: string;
  mobile: string;
  facebookUrl: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: Date | null;
  decidedAt: Date | null;
  decidedBy: string | null;
  rejectionReason: string | null;
};

export type VerificationFile = { mime: string; data: string };

function col() {
  return getAdminDb().collection("verifications");
}

function idHash(value: string) {
  const salt = `cc-verify-v1::${process.env.FIREBASE_PROJECT_ID ?? "local"}`;
  return createHash("sha256").update(`${salt}|${value}`).digest("hex");
}

function fromSnap(id: string, data: FirebaseFirestore.DocumentData): VerificationRequest {
  return {
    id,
    uid: data.uid,
    requesterName: data.requesterName ?? "",
    legalName: data.legalName ?? "",
    idType: data.idType,
    idNumberLast4: data.idNumberLast4 ?? "",
    mobile: data.mobile ?? "",
    facebookUrl: data.facebookUrl ?? "",
    status: data.status ?? "pending",
    submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : null,
    decidedAt: data.decidedAt instanceof Timestamp ? data.decidedAt.toDate() : null,
    decidedBy: data.decidedBy ?? null,
    rejectionReason: data.rejectionReason ?? null,
  };
}

/** All requests for a provider, newest first (in-memory sort; launch scale). */
export async function listMyVerifications(uid: string): Promise<VerificationRequest[]> {
  const snap = await col().where("uid", "==", uid).limit(20).get();
  return snap.docs
    .map((d) => fromSnap(d.id, d.data()))
    .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0));
}

export async function listPendingVerifications(): Promise<VerificationRequest[]> {
  const snap = await col().where("status", "==", "pending").limit(30).get();
  return snap.docs
    .map((d) => fromSnap(d.id, d.data()))
    .sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0));
}

/** Inline images for the admin review (deleted once decided). */
export async function getVerificationFiles(
  requestId: string
): Promise<VerificationFile[]> {
  const snap = await col().doc(requestId).collection("files").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return { mime: data.mime ?? "image/jpeg", data: data.data ?? "" };
  });
}

export const VERIFICATION_REJECT_COOLDOWN_DAYS = 7;

export async function createVerificationRequest(input: {
  uid: string;
  requesterName: string;
  legalName: string;
  idType: VerificationIdType;
  idNumber: string;
  mobile: string;
  facebookUrl: string;
  files: VerificationFile[];
}): Promise<{ ok: true } | { error: string }> {
  const existing = await listMyVerifications(input.uid);
  if (existing.some((v) => v.status === "pending")) {
    return { error: "You already have a verification request under review." };
  }
  const lastRejected = existing.find((v) => v.status === "rejected");
  if (lastRejected?.decidedAt) {
    const cooldownMs = VERIFICATION_REJECT_COOLDOWN_DAYS * 24 * 3600 * 1000;
    if (Date.now() - lastRejected.decidedAt.getTime() < cooldownMs) {
      return {
        error: `You can resubmit ${VERIFICATION_REJECT_COOLDOWN_DAYS} days after a rejection — please wait a little longer.`,
      };
    }
  }
  if (input.files.some((f) => f.data.length > 1_200_000)) {
    return { error: "One of your photos is too large — please retake it." };
  }

  const db = getAdminDb();
  const batch = db.batch();
  const reqRef = col().doc();
  const fileIds: string[] = [];
  for (const f of input.files) {
    const fileRef = reqRef.collection("files").doc();
    fileIds.push(fileRef.id);
    batch.set(fileRef, f);
  }
  batch.set(reqRef, {
    uid: input.uid,
    requesterName: input.requesterName,
    legalName: input.legalName,
    idType: input.idType,
    idNumber: input.idNumber,
    idNumberLast4: input.idNumber.slice(-4),
    mobile: input.mobile,
    facebookUrl: input.facebookUrl,
    status: "pending",
    fileIds,
    submittedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await db.collection("profiles").doc(input.uid).set(
    { verificationStatus: "pending" },
    { merge: true }
  );
  return { ok: true as const };
}

export async function decideVerification(input: {
  adminUid: string;
  requestId: string;
  decision: "approved" | "rejected";
  reason?: string;
}): Promise<{ ok: true } | { error: string }> {
  if (input.decision === "rejected" && !input.reason?.trim()) {
    return { error: "A rejection reason is required — the provider will see it." };
  }

  const db = getAdminDb();
  const reqRef = col().doc(input.requestId);
  const preSnap = await reqRef.get();
  if (!preSnap.exists) return { error: "Verification request not found." };
  const pre = preSnap.data()!;
  const hashKey = idHash(`${pre.idType}|${pre.idNumber}`);

  return db
    .runTransaction(async (tx) => {
      const snap = await tx.get(reqRef);
      if (!snap.exists) return { error: "Verification request not found." };
      const data = snap.data()!;
      if (data.status !== "pending") return { error: "Already decided." };

      const profileRef = db.collection("profiles").doc(data.uid);

      if (input.decision === "approved") {
        // One ID can only ever verify one account.
        const hashRef = db.collection("verification_id_hashes").doc(hashKey);
        const dupe = await tx.get(hashRef);
        if (dupe.exists && dupe.data()?.usedByUid !== data.uid) {
          return {
            error:
              "This ID number has already been used to verify a different account. Reject and investigate.",
          };
        }
        tx.set(hashRef, { usedByUid: data.uid, at: FieldValue.serverTimestamp() });

        const validUntil = new Date(
          Date.now() + VERIFICATION_VALIDITY_DAYS * 24 * 3600 * 1000
        );
        tx.update(profileRef, {
          verificationStatus: "verified",
          verifiedAt: FieldValue.serverTimestamp(),
          verifiedUntil: Timestamp.fromDate(validUntil),
        });
      } else {
        tx.update(profileRef, { verificationStatus: "rejected" });
      }

      // Purge-on-decision: remove images and the full ID number; only the
      // decision metadata (type, last 4, reason) survives.
      for (const fid of (data.fileIds ?? []) as string[]) {
        tx.delete(reqRef.collection("files").doc(fid));
      }
      tx.update(reqRef, {
        status: input.decision,
        decidedAt: FieldValue.serverTimestamp(),
        decidedBy: input.adminUid,
        rejectionReason: input.decision === "rejected" ? input.reason ?? null : null,
        idNumber: FieldValue.delete(),
        fileIds: [],
        purged: true,
      });

      tx.create(db.collection("audit_log").doc(), {
        actorUid: input.adminUid,
        action: `verification.${input.decision}`,
        targetUid: data.uid,
        note: input.reason ?? null,
        at: FieldValue.serverTimestamp(),
      });

      return { ok: true as const };
    })
    .catch(() => ({ error: "Could not record the decision. Please try again." }));
}

/** Display status accounting for annual expiry (no cron needed). */
export function effectiveVerification(
  status: string | null | undefined,
  verifiedUntil: Date | null
): VerificationStatus {
  if (status === "verified") {
    if (verifiedUntil && verifiedUntil.getTime() < Date.now()) return "expired";
    return "verified";
  }
  if (status === "pending" || status === "rejected") return status;
  return "unverified";
}
