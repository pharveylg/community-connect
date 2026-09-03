"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { runCleanup, type CleanupClass } from "@/lib/reports";

const KINDS: CleanupClass[] = ["read_notifications", "expired_ads", "stale_tokens"];

/** One-click housekeeping (admin, typed confirmation, audited in lib). */
export async function cleanHousekeepingAction(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/");

  const kind = String(formData.get("kind") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (!KINDS.includes(kind as CleanupClass)) {
    redirect("/admin?tab=reports&error=Unknown+cleanup+class");
  }
  if (confirm !== "CLEAN") {
    redirect("/admin?tab=reports&error=Type+CLEAN+to+confirm");
  }

  const deleted = await runCleanup(kind as CleanupClass);
  revalidatePath("/admin");
  redirect(`/admin?tab=reports&cleaned=${encodeURIComponent(kind)}:${deleted}`);
}
