"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { getProfile } from "@/lib/firestore";
import { effectiveVerification } from "@/lib/verifications";
import { JobAdSchema, JobAdInterestSchema } from "@/lib/validation";
import {
  createJobAd,
  getJobAd,
  setAdStatus,
  upsertInterest,
  withdrawInterest,
  decideInterest,
  reportAd,
} from "@/lib/trabaho";

const CARE_CATEGORIES = new Set(["kasambahay-yaya", "househelp"]);

export async function createJobAdAction(input: unknown) {
  const parsed = JobAdSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the job details." };
  }
  const data = parsed.data;
  const profile = await getCurrentProfile();
  if (profile.role === "admin") {
    return { error: "Admins can't post job ads." };
  }
  // Core gate: only ID-verified accounts may post (anti-fake-vacancy).
  if (effectiveVerification(profile.verificationStatus, profile.verifiedUntil) !== "verified") {
    return {
      error:
        "Posting job ads needs ID verification — it's free and takes a day. Start under ID verification.",
    };
  }
  if (data.salaryMin != null && data.salaryMax != null && data.salaryMax < data.salaryMin) {
    return { error: "Salary range: maximum can't be lower than the minimum." };
  }
  if ((data.salaryMin != null) !== (data.salaryPeriod != null)) {
    return { error: "If you show a salary, pick per day / week / month." };
  }
  if (
    data.posterType === "household" &&
    CARE_CATEGORIES.has(data.categorySlug) &&
    !data.kasambahayAck
  ) {
    return { error: "Please confirm you've read the Kasambahay Law basics." };
  }

  const result = await createJobAd({
    posterUid: profile.uid,
    posterName: profile.fullName,
    posterType: data.posterType,
    title: data.title,
    description: data.description ?? "",
    categorySlug: data.categorySlug,
    employmentType: data.employmentType,
    schedule: data.schedule ?? "",
    salaryMin: data.salaryMin ?? null,
    salaryMax: data.salaryMax ?? null,
    salaryPeriod: data.salaryPeriod ?? null,
    barangay: data.barangay,
    city: data.city,
  });
  if ("error" in result && result.error) return { error: result.error };

  revalidatePath("/");
  revalidatePath("/trabaho");
  revalidatePath("/trabaho/my");
  redirect("/trabaho/my?posted=1");
}

export async function setAdStatusAction(formData: FormData) {
  const adId = String(formData.get("adId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "filled" && status !== "closed") return;
  const profile = await getCurrentProfile();
  const result = await setAdStatus(profile.uid, adId, status);
  if ("error" in result && result.error) {
    redirect(`/trabaho/my?error=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/");
  revalidatePath("/trabaho");
  revalidatePath("/trabaho/my");
  redirect(`/trabaho/my?${status}=1`);
}

export async function expressInterestAction(adId: string, input: unknown) {
  const parsed = JobAdInterestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your message." };
  }
  const profile = await getCurrentProfile();
  if (profile.role === "admin") {
    return { error: "Admins can't apply for jobs." };
  }
  const ad = await getJobAd(adId);
  if (!ad) return { error: "This job ad no longer exists." };

  const result = await upsertInterest(
    ad,
    { uid: profile.uid, name: profile.fullName },
    parsed.data.message ?? ""
  );
  if ("error" in result && result.error) return { error: result.error };

  revalidatePath(`/trabaho/${adId}`);
  revalidatePath("/trabaho/my");
  redirect(`/trabaho/${adId}?interested=1`);
}

export async function withdrawInterestAction(formData: FormData) {
  const adId = String(formData.get("adId") ?? "");
  const profile = await getCurrentProfile();
  const result = await withdrawInterest(adId, profile.uid);
  if ("error" in result && result.error) {
    redirect(`/trabaho/my?error=${encodeURIComponent(result.error)}`);
  }
  revalidatePath(`/trabaho/${adId}`);
  revalidatePath("/trabaho/my");
  redirect("/trabaho/my?withdrawn=1");
}

export async function decideInterestAction(formData: FormData) {
  const adId = String(formData.get("adId") ?? "");
  const workerUid = String(formData.get("workerUid") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "shortlisted" && decision !== "passed") return;

  const profile = await getCurrentProfile();
  const worker = await getProfile(workerUid);
  if (!worker) {
    redirect(`/trabaho/my?error=${encodeURIComponent("Worker account not found.")}`);
  }
  const result = await decideInterest(adId, profile.uid, workerUid, decision, {
    posterMobile: profile.mobile,
    workerMobile: worker.mobile,
  });
  if ("error" in result && result.error) {
    redirect(`/trabaho/my?error=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/trabaho/my");
  redirect(`/trabaho/my?${decision}=1`);
}

export async function reportAdAction(formData: FormData) {
  const adId = String(formData.get("adId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  const profile = await getCurrentProfile();
  if (!reason) {
    redirect(`/trabaho/${adId}?error=${encodeURIComponent("Tell us briefly what's wrong.")}`);
  }
  const result = await reportAd(adId, { uid: profile.uid, name: profile.fullName }, reason);
  if ("error" in result && result.error) {
    redirect(`/trabaho/${adId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/trabaho/${adId}?reported=1`);
}
