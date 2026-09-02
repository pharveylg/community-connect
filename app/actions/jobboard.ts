"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import {
  acceptOffer,
  closeJobPost,
  createJobPost,
  makeOffer,
  withdrawOffer,
} from "@/lib/jobboard";
import { allowanceFor } from "@/lib/wallet";
import { effectiveVerification } from "@/lib/verifications";
import { EXTRA_ACCEPT_FEE_PESOS } from "@/lib/catalog";
import { JobOfferSchema, JobPostSchema } from "@/lib/validation";
import type { JobOfferInput, JobPostInput } from "@/lib/validation";

export async function createJobPostAction(input: JobPostInput) {
  const parsed = JobPostSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your request." };
  }
  const profile = await getCurrentProfile();
  if (profile.role === "provider") {
    return { error: "You're registered as a provider — post from a seeker account." };
  }

  const result = await createJobPost({
    seekerUid: profile.uid,
    seekerName: profile.fullName,
    bookingFor: profile.bookingFor,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    categorySlug: parsed.data.categorySlug,
    barangay: parsed.data.barangay,
    city: parsed.data.city,
    whenNeeded: parsed.data.whenNeeded || "flexible",
    budget: parsed.data.budget ?? null,
  });
  if ("error" in result && result.error) return { error: result.error };

  revalidatePath("/seeker/requests");
  revalidatePath("/provider/jobs");
  redirect("/seeker/requests?posted=1");
}

export async function closeJobPostAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const profile = await getCurrentProfile();
  const result = await closeJobPost(profile.uid, postId);
  revalidatePath("/seeker/requests");
  revalidatePath("/provider/jobs");
  if ("error" in result && result.error) {
    redirect(`/seeker/requests?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/seeker/requests?closed=1");
}

export async function makeOfferAction(
  postId: string,
  input: JobOfferInput
): Promise<{ error?: string }> {
  const parsed = JobOfferSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your offer." };
  }

  const profile = await getCurrentProfile();
  if (profile.role !== "provider") {
    return { error: "Only providers can make offers." };
  }

  // Job board is the high-trust surface: only ID-verified providers may offer.
  if (effectiveVerification(profile.verificationStatus, profile.verifiedUntil) !== "verified") {
    return {
      error:
        "Only ID-verified providers can offer on job posts — it keeps the board safe for seekers. Get verified first (free, 1–2 days) from your dashboard.",
    };
  }

  // Soft fee gate: offering pre-commits an accept slot, so the provider must
  // be able to pay an accept right now.
  const allowance = allowanceFor(profile);
  if (allowance.freeRemaining <= 0 && profile.credits < EXTRA_ACCEPT_FEE_PESOS) {
    return {
      error: `You need a free accept or at least ₱${EXTRA_ACCEPT_FEE_PESOS} in credits to make offers — top up first.`,
    };
  }

  const result = await makeOffer({
    postId,
    providerUid: profile.uid,
    providerName: profile.fullName,
    amount: parsed.data.amount,
    message: parsed.data.message ?? "",
  });
  if ("error" in result && result.error) return { error: result.error };

  revalidatePath("/provider/jobs");
  revalidatePath("/seeker/requests");
  redirect("/provider/jobs?offered=1");
}

export async function withdrawOfferAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const profile = await getCurrentProfile();
  const result = await withdrawOffer(profile.uid, postId);
  revalidatePath("/provider/jobs");
  if ("error" in result && result.error) {
    redirect(`/provider/jobs?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/provider/jobs?withdrawn=1");
}

export async function acceptOfferAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const providerUid = String(formData.get("providerUid") ?? "");
  const profile = await getCurrentProfile();

  const result = await acceptOffer({
    seekerUid: profile.uid,
    postId,
    providerUid,
  });
  revalidatePath("/seeker/requests");
  revalidatePath("/seeker");
  revalidatePath("/provider");
  if ("error" in result && result.error) {
    redirect(`/seeker/requests?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/seeker/requests?matched=1");
}
