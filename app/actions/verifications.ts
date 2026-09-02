"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import { getProfile } from "@/lib/firestore";
import {
  createVerificationRequest,
  decideVerification,
  type VerificationFile,
} from "@/lib/verifications";
import { VerificationSchema, normalizePhMobile } from "@/lib/validation";
import type { VerificationInput } from "@/lib/validation";

export async function submitVerificationAction(
  input: VerificationInput,
  files: VerificationFile[]
): Promise<{ error?: string }> {
  const parsed = VerificationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  if (files.length < 2) {
    return { error: "Please upload both photos: the ID and your selfie holding it." };
  }

  const profile = await getCurrentProfile();
  if (profile.role !== "provider") {
    return { error: "Only providers can request ID verification." };
  }

  const mobile = normalizePhMobile(parsed.data.mobile)!;
  if (mobile !== normalizePhMobile(profile.mobile ?? "")) {
    return {
      error:
        "The mobile number must match the one on your profile — update your profile first if it changed.",
    };
  }

  const result = await createVerificationRequest({
    uid: profile.uid,
    requesterName: profile.fullName,
    legalName: parsed.data.legalName,
    idType: parsed.data.idType,
    idNumber: parsed.data.idNumber,
    mobile,
    facebookUrl: parsed.data.facebookUrl ?? "",
    files,
  });
  if ("error" in result && result.error) return { error: result.error };

  revalidatePath("/provider");
  revalidatePath("/admin");
  redirect("/provider/verification?submitted=1");
}

export async function decideVerificationAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const { uid } = await getCurrentProfile();
  const caller = await getProfile(uid);
  if (caller?.role !== "admin") return;
  if (decision !== "approved" && decision !== "rejected") return;

  const result = await decideVerification({
    adminUid: uid,
    requestId,
    decision,
    reason: reason || undefined,
  });
  revalidatePath("/admin");
  revalidatePath("/provider");
  if ("error" in result && result.error) {
    redirect(`/admin?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/admin?verification=${decision}`);
}
