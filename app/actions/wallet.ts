"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import { createTopUpRequest, decideTopUp, listPendingTopUps } from "@/lib/wallet";
import { notify } from "@/lib/push";
import { getProfile } from "@/lib/firestore";
import { TopUpRequestSchema } from "@/lib/validation";
import type { TopUpRequestInput } from "@/lib/validation";

export async function requestTopUpAction(
  input: TopUpRequestInput
): Promise<{ error?: string }> {
  const parsed = TopUpRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your top-up details." };
  }

  const profile = await getCurrentProfile();
  if (profile.role !== "provider") {
    return { error: "Only providers need credits." };
  }

  await createTopUpRequest(profile.uid, profile.fullName, parsed.data);
  revalidatePath("/provider/credits");
  revalidatePath("/admin");
  redirect("/provider/credits?requested=1");
}

export async function decideTopUpAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  // Route-level guard: the caller must be an admin.
  const { uid } = await getCurrentProfile();
  const caller = await getProfile(uid);
  if (caller?.role !== "admin") return;

  if (decision !== "approved" && decision !== "rejected") return;

  const t = (await listPendingTopUps()).find((x) => x.id === requestId);
  const result = await decideTopUp(uid, requestId, decision, note || undefined);
  revalidatePath("/admin");
  revalidatePath("/provider/credits");
  if ("error" in result && result.error) redirect(`/admin?error=${encodeURIComponent(result.error)}`);
  if (t) {
    await notify({
      uid: t.uid,
      type: decision === "approved" ? "topup_approved" : "topup_rejected",
      category: "accountModeration",
      title: decision === "approved" ? "Top-up approved ✅" : "Top-up not approved",
      body:
        decision === "approved"
          ? `₱${t.amount.toLocaleString("en-PH")} in credits was added to your wallet.`
          : `Your ₱${t.amount.toLocaleString("en-PH")} top-up was not approved${note ? ` — ${note}` : ""}. Contact support if you think this is wrong.`,
      link: "/provider/credits",
    });
  }
  redirect(`/admin?decided=${decision}&tab=topups`);
}
