"use server";

import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  addDependent,
  createProfile,
  getProfile,
  updateProfile,
  type BookingFor,
  type Role,
} from "@/lib/firestore";
import { createSession, deleteSession } from "@/lib/session";
import { verifySession } from "@/lib/dal";
import { roleHomePath, safeNextPath } from "@/lib/roles";
import { normalizePhMobile } from "@/lib/validation";
import {
  CompleteProfileSchema,
  DependentSchema,
  RegisterBasicInfoSchema,
  type DependentInput,
} from "@/lib/validation";

// Roles a user may pick for THEMSELVES. Admin is deliberately absent: the
// public setRole action must never accept "admin" — granting admin is
// admin-only (see app/actions/admin.ts) or done by seeding the profile
// directly (see README).
export type SelfSelectableRole = Exclude<Role, "admin">;

export async function registerAccount(
  idToken: string,
  basicInfo: { fullName: string; mobile: string; email: string }
) {
  const parsed = RegisterBasicInfoSchema.pick({
    fullName: true,
    mobile: true,
    email: true,
  }).safeParse(basicInfo);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const decoded = await getAdminAuth().verifyIdToken(idToken);
  await createProfile(decoded.uid, {
    fullName: parsed.data.fullName,
    mobile: normalizePhMobile(parsed.data.mobile)!,
    email: parsed.data.email,
  });
  await createSession(idToken);
  return { success: true as const };
}

export async function completeProfile(
  input: { fullName: string; mobile: string },
  next?: string
) {
  const parsed = CompleteProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const { uid } = await verifySession();

  // Guard against overwriting an existing profile (e.g. double submit).
  const existing = await getProfile(uid);
  if (existing) redirect(safeNextPath(next) ?? roleHomePath(existing.role));

  const user = await getAdminAuth().getUser(uid);
  await createProfile(uid, {
    fullName: parsed.data.fullName,
    mobile: normalizePhMobile(parsed.data.mobile)!,
    email: user.email ?? "",
  });
  redirect(`/onboarding?step=role${safeNextPath(next) ? `&next=${encodeURIComponent(safeNextPath(next)!)}` : ""}`);
}

export async function login(idToken: string, next?: string) {
  await createSession(idToken);
  const { uid } = await verifySession();
  const profile = await getProfile(uid);
  // Authenticated but profile incomplete (or role never chosen): resume
  // onboarding instead of dead-ending in a redirect loop.
  const dest = safeNextPath(next);
  if (!profile) redirect(`/onboarding${dest ? `?next=${encodeURIComponent(dest)}` : ""}`);
  if (!profile.role) redirect(`/onboarding?step=role${dest ? `&next=${encodeURIComponent(dest)}` : ""}`);
  redirect(dest ?? roleHomePath(profile.role));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function setRole(role: SelfSelectableRole, next?: string) {
  // Defense in depth: never let this public action grant admin.
  if (role !== "seeker" && role !== "provider") {
    throw new Error("Invalid role.");
  }

  const { uid } = await verifySession();
  const profile = await getProfile(uid);
  // Admins keep their role; they manage the platform, not switch out of it.
  if (profile?.role === "admin") {
    return { error: "Admins cannot switch roles." };
  }

  await updateProfile(uid, { role });

  if (role === "seeker") return { next: "seekerOnboard" as const };

  await updateProfile(uid, { bookingFor: null });
  redirect(safeNextPath(next) ?? roleHomePath(role));
}

export async function setBookingFor(bookingFor: BookingFor, next?: string) {
  const { uid } = await verifySession();
  await updateProfile(uid, { bookingFor });

  if (bookingFor === "dependent") return { next: "dependentSetup" as const };

  redirect(safeNextPath(next) ?? roleHomePath("seeker"));
}

export async function addDependentAction(input: DependentInput, next?: string) {
  const parsed = DependentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const { uid } = await verifySession();
  await addDependent(uid, parsed.data);
  redirect(safeNextPath(next) ?? roleHomePath("seeker"));
}

export async function skipDependentSetup(next?: string) {
  await verifySession();
  redirect(safeNextPath(next) ?? roleHomePath("seeker"));
}
