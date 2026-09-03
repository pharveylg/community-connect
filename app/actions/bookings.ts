"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import {
  acceptBooking,
  cancelBooking,
  completeBooking,
  createBooking,
  declineBooking,
  vouchForProvider,
} from "@/lib/bookings";
import { BookingRequestSchema } from "@/lib/validation";
import { getServiceListing } from "@/lib/firestore";
import { getBookingById } from "@/lib/bookings";
import { notify } from "@/lib/push";
import { guardContent } from "@/lib/content-guard";
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

  // Booking messages are seen BEFORE the provider accepts — same scam rules.
  // Numbers are fine here (legit coordination once booking is in flight).
  const guard = guardContent(
    { message: parsed.data.message ?? "" },
    { phoneOk: true }
  );
  if ("error" in guard) return { error: guard.error };

  const result = await createBooking(
    { uid: profile.uid, fullName: profile.fullName },
    serviceId,
    parsed.data
  );
  if ("error" in result && result.error) return { error: result.error };

  const svc = await getServiceListing(serviceId);
  if (svc) {
    await notify({
      uid: svc.providerUid,
      type: "booking_request",
      category: "bookingOffers",
      urgent: true,
      title: "New booking request",
      body: `${profile.fullName.split(" ")[0]} requested “${svc.title}” — accept or decline it.`,
      link: "/provider",
    });
  }

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
  const booking = await getBookingById(bookingId);
  if (booking) {
    await notify({
      uid: booking.seekerUid,
      type: "booking_accepted",
      category: "bookingOffers",
      urgent: true,
      title: "Booking accepted ✅",
      body: `Your provider confirmed “${booking.serviceTitle}”. Payment is arranged directly with them.`,
      link: "/seeker",
    });
  }
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

export async function completeBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const profile = await getCurrentProfile();

  const result = await completeBooking(profile.uid, bookingId);
  revalidatePath("/seeker");
  revalidatePath("/provider");
  if ("error" in result && result.error) redirect(`/seeker?error=${encodeURIComponent(result.error)}`);
  const booking = await getBookingById(bookingId);
  if (booking) {
    await notify({
      uid: booking.providerUid,
      type: "booking_completed",
      category: "bookingOffers",
      title: "Job marked complete ✓",
      body: `${profile.fullName.split(" ")[0]} marked “${booking.serviceTitle}” as done. Thanks!`,
      link: "/provider",
    });
  }
  redirect("/seeker?done=1");
}

export async function vouchForProviderAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const profile = await getCurrentProfile();

  const result = await vouchForProvider(profile.uid, bookingId);
  revalidatePath("/seeker");
  revalidatePath("/provider");
  if ("error" in result && result.error) redirect(`/seeker?error=${encodeURIComponent(result.error)}`);
  redirect("/seeker?vouched=1");
}
