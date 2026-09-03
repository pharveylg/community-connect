"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { markAllRead } from "@/lib/notifications";

export async function markNotificationsReadAction() {
  const profile = await getCurrentProfile();
  await markAllRead(profile.uid);
  revalidatePath("/notifications");
  redirect("/notifications");
}
