"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import {
  acceptBooking,
  cancelBooking,
  createBooking,
  declineBooking,
} from "@/lib/bookings";
import { BookingRequestSchema } from "@/lib/validation";
import type { BookingRequestInput } from "@/lib/validation";

export async function createBookingAction(
  serviceId: string,
  input: BookingRequestInput
): Promise<{ error?: string }> {
  const parsed = BookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your request." };
  }

  const profile = await getCurrentProfile();
  if (profile.role === "provider") {
    return { error: "You're registered as a provider — book with a seeker account." };
  }

  const result = await createBooking(
    { uid: profile.uid, fullName: profile.fullName },
    serviceId,
    parsed.data
  );
  if ("error" in result && result.error) return { error: result.error };

  revalidatePath("/seeker");
  revalidatePath("/provider");
  redirect("/seeker?booked=1");
}

export async function acceptBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const profile = await getCurrentProfile();
  if (profile.role !== "provider") return;

  const result = await acceptBooking(profile.uid, bookingId);
  revalidatePath("/provider");
  revalidatePath("/seeker");
  if ("error" in result && result.error) redirect(`/provider?error=${encodeURIComponent(result.error)}`);
  redirect("/provider?accepted=1");
}

export async function declineBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const profile = await getCurrentProfile();
  if (profile.role !== "provider") return;

  const result = await declineBooking(profile.uid, bookingId);
  revalidatePath("/provider");
  revalidatePath("/seeker");
  if ("error" in result && result.error) redirect(`/provider?error=${encodeURIComponent(result.error)}`);
  redirect("/provider?declined=1");
}

export async function cancelBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const profile = await getCurrentProfile();

  const result = await cancelBooking(profile.uid, bookingId);
  revalidatePath("/seeker");
  revalidatePath("/provider");
  if ("error" in result && result.error) redirect(`/seeker?error=${encodeURIComponent(result.error)}`);
  redirect("/seeker?cancelled=1");
}
