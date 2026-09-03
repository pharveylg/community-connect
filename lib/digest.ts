import { getAdminDb } from "@/lib/firebase/admin";
import { notify } from "@/lib/push";
import { Timestamp } from "firebase-admin/firestore";
import { listOpenAds } from "@/lib/trabaho";

// Daily digest (opt-in): one morning push summarizing new marketplace
// activity in the last 24h. Triggered by the Vercel cron (08:00 PHT).
// No new infra — one equality query per collection, batched sends.

export async function sendDailyDigest(): Promise<{ sent: number; skipped: boolean }> {
  const since = new Date(Date.now() - 86400000);
  const db = getAdminDb();

  const [newPosts, newServices] = await Promise.all([
    db.collection("job_posts").where("createdAt", ">=", Timestamp.fromDate(since)).limit(50).get(),
    db.collection("services").where("createdAt", ">=", Timestamp.fromDate(since)).limit(50).get(),
  ]);
  const newAds = (await listOpenAds()).filter(
    (a) => a.createdAt && a.createdAt.getTime() >= since.getTime()
  );

  const total = newPosts.size + newServices.size + newAds.length;
  if (total === 0) return { sent: 0, skipped: true };

  const body =
    `${newPosts.size + newAds.length} new job${newPosts.size + newAds.length === 1 ? "" : "s"}` +
    `${newServices.size > 0 ? ` · ${newServices.size} new service${newServices.size === 1 ? "" : "s"} listed` : ""}` +
    ` — see what's new near you.`;

  const optedIn = await db
    .collection("profiles")
    .where("notificationPrefs.digest", "==", true)
    .limit(500)
    .get();

  for (const doc of optedIn.docs) {
    await notify({
      uid: doc.id,
      type: "daily_digest",
      category: "jobTrabaho",
      title: "Today on Community Connect",
      body,
      link: "/trabaho",
    });
  }
  return { sent: optedIn.size, skipped: false };
}
