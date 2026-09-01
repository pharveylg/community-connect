import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getProfile, type Profile } from "@/lib/firestore";
import { readSessionCookie } from "@/lib/session";

export const verifySession = cache(async (): Promise<{ uid: string }> => {
  const sessionCookie = await readSessionCookie();
  if (!sessionCookie) redirect("/login");

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return { uid: decoded.uid };
  } catch {
    redirect("/login");
  }
});

export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const { uid } = await verifySession();
  const profile = await getProfile(uid);
  if (!profile) redirect("/login");
  return profile;
});
