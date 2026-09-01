"use server";

import { getProfile, updateProfile, type Role } from "@/lib/firestore";
import { verifySession } from "@/lib/dal";

const VALID_ROLES: Role[] = ["seeker", "provider", "admin"];

/**
 * Admin-only: change another user's role. The caller must already be an
 * admin. Admins are created either by another admin or by seeding the
 * profile doc directly in the Firebase console (see README) — never through
 * the public signup flow.
 */
export async function changeUserRole(targetUid: string, role: Role) {
  const { uid } = await verifySession();
  const caller = await getProfile(uid);
  if (caller?.role !== "admin") {
    return { error: "Only admins can change roles." };
  }
  if (!VALID_ROLES.includes(role)) {
    return { error: "Invalid role." };
  }
  if (targetUid === uid && role !== "admin") {
    return { error: "You cannot remove your own admin access." };
  }

  await updateProfile(targetUid, { role });
  return { success: true as const };
}
