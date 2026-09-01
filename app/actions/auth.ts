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
import {
  DependentSchema,
  RegisterBasicInfoSchema,
  type DependentInput,
} from "@/lib/validation";

function roleHomePath(role: Role | null) {
  if (role === "provider") return "/provider";
  if (role === "admin") return "/admin";
  return "/seeker";
}

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
  await createProfile(decoded.uid, parsed.data);
  await createSession(idToken);
  return { success: true as const };
}

export async function login(idToken: string) {
  await createSession(idToken);
  const { uid } = await verifySession();
  const profile = await getProfile(uid);
  redirect(roleHomePath(profile?.role ?? null));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function setRole(role: Role) {
  const { uid } = await verifySession();
  await updateProfile(uid, { role });

  if (role === "seeker") return { next: "seekerOnboard" as const };

  await updateProfile(uid, { bookingFor: null });
  redirect(roleHomePath(role));
}

export async function setBookingFor(bookingFor: BookingFor) {
  const { uid } = await verifySession();
  await updateProfile(uid, { bookingFor });

  if (bookingFor === "dependent") return { next: "dependentSetup" as const };

  redirect(roleHomePath("seeker"));
}

export async function addDependentAction(input: DependentInput) {
  const parsed = DependentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const { uid } = await verifySession();
  await addDependent(uid, parsed.data);
  redirect(roleHomePath("seeker"));
}

export async function skipDependentSetup() {
  await verifySession();
  redirect(roleHomePath("seeker"));
}
