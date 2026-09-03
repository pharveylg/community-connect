"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { safeNextPath } from "@/lib/roles";
import {
  fileReport,
  hideTarget,
  restoreTarget,
  resolveTargetReports,
  markReviewed,
  notifyOwner,
  type ReportTargetType,
} from "@/lib/moderation";

const TARGET_TYPES: ReportTargetType[] = ["listing", "job_post", "job_offer", "job_ad", "job_ad_interest"];

async function snapshotFor(targetType: ReportTargetType, targetId: string) {
  const db = getAdminDb();
  let col: string;
  switch (targetType) {
    case "listing": col = "services"; break;
    case "job_post": col = "job_posts"; break;
    case "job_offer": col = "job_offers"; break;
    case "job_ad": col = "job_ads"; break;
    case "job_ad_interest": col = "job_ad_interests"; break;
  }
  const snap = await db.collection(col).doc(targetId).get();
  if (!snap.exists) return null;
  const d = snap.data() ?? {};
  const title =
    d.title ?? d.providerName ?? d.workerName ?? targetId;
  const text = String(d.description ?? d.message ?? "").slice(0, 400);
  return { title: String(title), text };
}

/** Anyone logged in can report content. 3 distinct reports auto-hide. */
export async function reportAction(formData: FormData) {
  const targetType = String(formData.get("targetType") ?? "") as ReportTargetType;
  const targetId = String(formData.get("targetId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  const back = safeNextPath(formData.get("back")) ?? "/";
  const qs = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    return `${back}${back.includes("?") ? "&" : "?"}${sp.toString()}`;
  };

  if (!TARGET_TYPES.includes(targetType) || !targetId) {
    redirect(qs({ error: "Nothing to report." }));
  }
  if (!reason) {
    redirect(qs({ error: "Tell us briefly what's wrong." }));
  }

  const profile = await getCurrentProfile();
  const snapshot = await snapshotFor(targetType, targetId);
  if (!snapshot) {
    redirect(qs({ error: "That content no longer exists." }));
  }

  const result = await fileReport({
    reporter: { uid: profile.uid, name: profile.fullName },
    targetType,
    targetId,
    reason,
    snapshotTitle: snapshot.title,
    snapshotText: snapshot.text,
  });
  if ("error" in result && result.error) {
    redirect(qs({ error: result.error }));
  }

  revalidatePath("/admin");
  redirect(qs({ reported: "1" }));
}

/** Admin decisions on reported / flagged content. */
export async function adminModerateAction(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") return;

  const op = String(formData.get("op") ?? "");
  const targetType = formData.get("targetType") as ReportTargetType | null;
  const targetId = String(formData.get("targetId") ?? "");
  const collection = formData.get("collection");
  const flaggedId = String(formData.get("flaggedId") ?? "");

  if (op === "remove" && targetType && TARGET_TYPES.includes(targetType) && targetId) {
    await hideTarget(targetType, targetId);
    await resolveTargetReports(targetType, targetId, profile.uid);
    await notifyOwner(targetType, targetId, "moderator");
  } else if (op === "keep" && targetType && TARGET_TYPES.includes(targetType) && targetId) {
    // False positive: restore if it was auto-hidden, resolve reports.
    const wasHidden = await restoreTarget(targetType, targetId);
    await resolveTargetReports(targetType, targetId, profile.uid);
    await notifyOwner(targetType, targetId, "restored");
  } else if (op === "restore" && targetType && TARGET_TYPES.includes(targetType) && targetId) {
    await restoreTarget(targetType, targetId);
    await notifyOwner(targetType, targetId, "restored");
  } else if (op === "reviewed" && collection && flaggedId) {
    await markReviewed(String(collection), flaggedId);
  } else if (op === "remove-flagged" && collection && flaggedId) {
    // Map a flagged doc to its hideable target where possible.
    const colToTarget: Record<string, ReportTargetType> = {
      services: "listing",
      job_posts: "job_post",
      job_ads: "job_ad",
      job_offers: "job_offer",
      job_ad_interests: "job_ad_interest",
    };
    const t = colToTarget[String(collection)];
    if (t) await hideTarget(t, flaggedId);
    await markReviewed(String(collection), flaggedId);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?moderated=1");
}
