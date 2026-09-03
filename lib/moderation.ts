import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

// Moderation engine: user reports + tripwire auto-hide + flagged-content
// listing for the admin queue. Content rules live in lib/content-guard.ts;
// this module handles the lifecycle (report -> auto-hide at 3 distinct
// reporters -> admin decision -> restore/remove/resolve).

export type ReportTargetType = "listing" | "job_post" | "job_offer" | "job_ad" | "job_ad_interest";

export const AUTO_HIDE_REPORTERS = 3;

/** Hideable targets have a visibility field we can flip without query changes. */
function visibilityField(targetType: ReportTargetType): "active" | "status" | null {
  if (targetType === "listing") return "active";
  if (targetType === "job_post" || targetType === "job_ad") return "status";
  return null; // offers/interests are not publicly listed — reports only queue
}

function collectionFor(targetType: ReportTargetType) {
  const db = getAdminDb();
  switch (targetType) {
    case "listing":
      return db.collection("services");
    case "job_post":
      return db.collection("job_posts");
    case "job_offer":
      return db.collection("job_offers");
    case "job_ad":
      return db.collection("job_ads");
    case "job_ad_interest":
      return db.collection("job_ad_interests");
  }
}

export type ContentReport = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reporterUid: string;
  reporterName: string;
  reason: string;
  snapshotTitle: string;
  snapshotText: string;
  hidden: boolean;
  resolved: boolean;
  resolvedBy: string | null;
  createdAt: Date | null;
};

function reportFromSnap(id: string, d: FirebaseFirestore.DocumentData): ContentReport {
  return {
    id,
    targetType: d.targetType,
    targetId: d.targetId,
    reporterUid: d.reporterUid,
    reporterName: d.reporterName ?? "",
    reason: d.reason ?? "",
    snapshotTitle: d.snapshotTitle ?? "",
    snapshotText: d.snapshotText ?? "",
    hidden: d.hidden === true,
    resolved: d.resolved === true,
    resolvedBy: d.resolvedBy ?? null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
  };
}

function reportsCol() {
  return getAdminDb().collection("content_reports");
}

/**
 * File a report (one per user per target). At >=3 DISTINCT reporters the
 * target is auto-hidden (unlisted / closed) pending admin review — this is
 * the 24-hour-takedown safety net that works while you sleep.
 */
export async function fileReport(input: {
  reporter: { uid: string; name: string };
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  snapshotTitle: string;
  snapshotText: string;
}): Promise<{ ok: true; hidden: boolean } | { error: string }> {
  const ref = reportsCol().doc(`${input.targetType}_${input.targetId}__${input.reporter.uid}`);
  const existing = await ref.get();
  if (existing.exists) {
    return { error: "You already reported this — our team is on it." } as const;
  }

  // Count distinct reporters so far (docId guarantees distinctness).
  const siblings = await reportsCol()
    .where("targetType", "==", input.targetType)
    .where("targetId", "==", input.targetId)
    .get();
  const distinctReporters = siblings.size;
  const shouldHide =
    distinctReporters + 1 >= AUTO_HIDE_REPORTERS &&
    visibilityField(input.targetType) !== null &&
    !(siblings.docs.some((d) => d.data().hidden === true));

  let hidden = false;
  if (shouldHide) {
    const hid = await hideTarget(input.targetType, input.targetId);
    hidden = "ok" in hid;
  }

  await ref.set({
    targetType: input.targetType,
    targetId: input.targetId,
    reporterUid: input.reporter.uid,
    reporterName: input.reporter.name,
    reason: input.reason,
    snapshotTitle: input.snapshotTitle,
    snapshotText: input.snapshotText,
    hidden,
    resolved: false,
    resolvedBy: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true as const, hidden };
}

/** Flip the target's visibility field. Returns false when already hidden. */
export async function hideTarget(
  targetType: ReportTargetType,
  targetId: string
): Promise<{ ok: true } | { error: string }> {
  const field = visibilityField(targetType);
  if (!field) return { error: "This content type can't be hidden — reports only queue." } as const;
  const ref = collectionFor(targetType).doc(targetId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Content no longer exists." } as const;
  const data = snap.data() ?? {};
  if (field === "active") {
    if (data.active !== true) return { ok: true as const };
    await ref.update({ active: false, moderation: { ...(data.moderation ?? {}), hiddenAt: FieldValue.serverTimestamp() } });
  } else {
    if (data.status !== "open") return { ok: true as const };
    await ref.update({
      status: "closed",
      moderation: { ...(data.moderation ?? {}), priorStatus: "open", hiddenAt: FieldValue.serverTimestamp() },
    });
  }
  return { ok: true as const };
}

/** Admin: bring hidden content back (false-positive undo). */
export async function restoreTarget(
  targetType: ReportTargetType,
  targetId: string
): Promise<{ ok: true } | { error: string }> {
  const field = visibilityField(targetType);
  if (!field) return { error: "Nothing to restore for this type." } as const;
  const ref = collectionFor(targetType).doc(targetId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Content no longer exists." } as const;
  const data = snap.data() ?? {};
  if (field === "active") {
    await ref.update({ active: true, moderation: { ...(data.moderation ?? {}), hiddenAt: null } });
  } else {
    const prior = data.moderation?.priorStatus ?? "open";
    await ref.update({ status: prior, moderation: { ...(data.moderation ?? {}), priorStatus: null, hiddenAt: null } });
  }
  return { ok: true as const };
}

export async function listUnresolvedReports(limitCount = 30): Promise<ContentReport[]> {
  const snap = await reportsCol().where("resolved", "==", false).limit(limitCount).get();
  return snap.docs
    .map((d) => reportFromSnap(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

/** Group unresolved reports by target so the admin queue shows one card per item. */
export function groupReportsByTarget(reports: ContentReport[]) {
  const map = new Map<string, { key: string; targetType: ReportTargetType; targetId: string; title: string; text: string; hidden: boolean; reasons: string[]; count: number; latest: Date | null }>();
  for (const r of reports) {
    const key = `${r.targetType}_${r.targetId}`;
    const entry = map.get(key);
    if (entry) {
      entry.count += 1;
      entry.reasons.push(`${r.reporterName}: ${r.reason}`);
      if ((r.createdAt?.getTime() ?? 0) > (entry.latest?.getTime() ?? 0)) entry.latest = r.createdAt;
    } else {
      map.set(key, {
        key,
        targetType: r.targetType,
        targetId: r.targetId,
        title: r.snapshotTitle,
        text: r.snapshotText,
        hidden: r.hidden,
        reasons: [`${r.reporterName}: ${r.reason}`],
        count: 1,
        latest: r.createdAt,
      });
    }
  }
  return [...map.values()];
}

export async function resolveTargetReports(
  targetType: ReportTargetType,
  targetId: string,
  resolvedBy: string
): Promise<void> {
  const snap = await reportsCol()
    .where("targetType", "==", targetType)
    .where("targetId", "==", targetId)
    .get();
  const batch = getAdminDb().batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { resolved: true, resolvedBy });
  }
  await batch.commit();
}

/** Flagged-by-guard content awaiting first review (moderation.flagged, unreviewed). */
export type FlaggedItem = {
  collection: "job_posts" | "job_ads" | "services" | "job_offers" | "job_ad_interests";
  id: string;
  title: string;
  text: string;
  tags: string[];
};

export async function listFlaggedContent(): Promise<FlaggedItem[]> {
  const db = getAdminDb();
  const specs: { col: FlaggedItem["collection"]; titleField: string; textField: string }[] = [
    { col: "job_posts", titleField: "title", textField: "description" },
    { col: "job_ads", titleField: "title", textField: "description" },
    { col: "services", titleField: "title", textField: "description" },
    { col: "job_offers", titleField: "providerName", textField: "message" },
    { col: "job_ad_interests", titleField: "workerName", textField: "message" },
  ];
  const results: FlaggedItem[] = [];
  await Promise.all(
    specs.map(async (spec) => {
      const snap = await db.collection(spec.col).where("moderation.flagged", "==", true).limit(10).get();
      for (const doc of snap.docs) {
        const d = doc.data();
        if (d.moderation?.reviewed === true) continue;
        results.push({
          collection: spec.col,
          id: doc.id,
          title: String(d[spec.titleField] ?? spec.col),
          text: String(d[spec.textField] ?? "").slice(0, 300),
          tags: Array.isArray(d.moderation?.terms) ? d.moderation.terms : [],
        });
      }
    })
  );
  return results;
}

export async function markReviewed(collection: string, id: string): Promise<void> {
  const ref = getAdminDb().collection(collection).doc(id);
  const snap = await ref.get();
  const mod = snap.data()?.moderation ?? {};
  await ref.update({ moderation: { ...mod, flagged: true, reviewed: true } });
}
