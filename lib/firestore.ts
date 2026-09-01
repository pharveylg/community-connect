import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

export type Role = "seeker" | "provider" | "admin";
export type BookingFor = "self" | "dependent";

export type Profile = {
  uid: string;
  fullName: string;
  mobile: string;
  email: string;
  role: Role | null;
  bookingFor: BookingFor | null;
};

export type Dependent = {
  id: string;
  name: string;
  relationship: string;
  notes: string;
};

function profileRef(uid: string) {
  return getAdminDb().collection("profiles").doc(uid);
}

export async function createProfile(
  uid: string,
  data: { fullName: string; mobile: string; email: string }
) {
  await profileRef(uid).set({
    ...data,
    role: null,
    bookingFor: null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await profileRef(uid).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    uid,
    fullName: data.fullName,
    mobile: data.mobile,
    email: data.email,
    role: data.role ?? null,
    bookingFor: data.bookingFor ?? null,
  };
}

export async function updateProfile(
  uid: string,
  data: Partial<Pick<Profile, "role" | "bookingFor">>
) {
  await profileRef(uid).set(data, { merge: true });
}

export async function addDependent(
  uid: string,
  data: { name: string; relationship: string; notes: string }
) {
  await profileRef(uid)
    .collection("dependents")
    .add({ ...data, createdAt: FieldValue.serverTimestamp() });
}
