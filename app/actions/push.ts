"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { savePushToken, updatePushPrefs, type PushPrefs } from "@/lib/push";

export async function savePushTokenAction(token: string, platform: string) {
  if (!token) return;
  const profile = await getCurrentProfile();
  await savePushToken(profile.uid, token, platform);
}

export async function removePushTokenAction(token: string) {
  if (!token) return;
  await getAdminDb().collection("push_tokens").doc(token).delete();
}

export async function updatePushPrefsAction(prefs: PushPrefs) {
  const profile = await getCurrentProfile();
  await updatePushPrefs(profile.uid, {
    bookingOffers: prefs.bookingOffers !== false,
    jobTrabaho: prefs.jobTrabaho !== false,
    accountModeration: prefs.accountModeration !== false,
    digest: prefs.digest === true,
  });
  revalidatePath("/notifications");
}

export async function updatePushPrefsFormAction(formData: FormData) {
  const prefs = {
    bookingOffers: formData.get("bookingOffers") === "on",
    jobTrabaho: formData.get("jobTrabaho") === "on",
    accountModeration: formData.get("accountModeration") === "on",
    digest: formData.get("digest") === "on",
  };
  await updatePushPrefsAction(prefs);
}
