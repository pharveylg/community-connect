import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getProfile, type Profile } from "@/lib/firestore";
import { readSessionCookie } from "@/lib/session";

/**
 * Soft session check: returns the uid when the session cookie is VALID,
 * null when absent or invalid (expired/revoked). Never redirects — use on
 * public pages (landing, login, register) so a stale cookie can never
 * bounce a user into a redirect loop.
 */
export const getSessionUid = cache(async (): Promise<string | null> => {
  const sessionCookie = await readSessionCookie();
  if (!sessionCookie) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
});

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
  // Valid session but no profile (e.g. registration was interrupted after the
  // Firebase Auth user was created). Send them to complete their profile
  // instead of /login, which would just bounce them back — a dead end.
  if (!profile) redirect("/onboarding");
  return profile;
});
