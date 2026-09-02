"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import {
  createServiceListing,
  getProviderServices,
  getServiceListing,
  setServiceListingActive,
} from "@/lib/firestore";
import { ServiceListingSchema } from "@/lib/validation";
import {
  CUSTOM_CATEGORY,
  FREE_MAX_ACTIVE_SERVICES,
  getCategory,
} from "@/lib/catalog";
import type { ServiceListingInput } from "@/lib/validation";

export async function createServiceAction(input: ServiceListingInput) {
  const parsed = ServiceListingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your service details." };
  }

  const profile = await getCurrentProfile();
  if (profile.role !== "provider") {
    return { error: "Switch to a provider account to list services." };
  }

  const category = getCategory(parsed.data.categorySlug);
  if (!category) return { error: "Please choose a service category." };

  // Free-tier entitlement: cap on active listings.
  const existing = await getProviderServices(profile.uid);
  const activeCount = existing.filter((s) => s.active).length;
  if (activeCount >= FREE_MAX_ACTIVE_SERVICES) {
    return {
      error: `Free accounts can have ${FREE_MAX_ACTIVE_SERVICES} active services. Pause one first, or top up for more slots (coming soon).`,
    };
  }

  await createServiceListing({
    providerUid: profile.uid,
    providerName: profile.fullName,
    categorySlug: category.slug,
    categoryLabel: category.label,
    custom: category.slug === CUSTOM_CATEGORY,
    title: parsed.data.title,
    description: parsed.data.description,
    rateType: parsed.data.rateType,
    rateAmount: parsed.data.rateAmount,
    negotiable: parsed.data.negotiable,
    city: parsed.data.city,
    barangay: parsed.data.barangay,
    leadTime: parsed.data.leadTime,
  });

  redirect("/provider");
}

export async function toggleServiceActiveAction(formData: FormData) {
  const serviceId = String(formData.get("serviceId") ?? "");
  if (!serviceId) return;

  const profile = await getCurrentProfile();
  if (profile.role !== "provider") return;

  const service = await getServiceListing(serviceId);
  if (!service || service.providerUid !== profile.uid) return;

  if (!service.active) {
    // Resuming counts against the active-listing cap. Never fail silently —
    // explain and let the provider choose what to pause instead.
    const existing = await getProviderServices(profile.uid);
    const activeCount = existing.filter((s) => s.active).length;
    if (activeCount >= FREE_MAX_ACTIVE_SERVICES) {
      redirect(
        `/provider?error=${encodeURIComponent(
          `Free plan allows ${FREE_MAX_ACTIVE_SERVICES} active services — pause another one first, or finish an active service before resuming this.`
        )}`
      );
    }
  }

  await setServiceListingActive(serviceId, !service.active);
  revalidatePath("/provider");
}
