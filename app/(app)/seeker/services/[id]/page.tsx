import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { getServiceListing } from "@/lib/firestore";
import { LEAD_TIME_LABELS, RATE_TYPE_LABELS, type RateType } from "@/lib/catalog";
import { BlurFade } from "@/components/mp/blur-fade";
import { AnimatedNumber } from "@/components/mp/animated-number";
import { RequestBookingForm } from "./request-booking-form";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const service = await getServiceListing(id);
  if (!service || !service.active) notFound();

  return (
    <div className="mx-auto w-full max-w-sm">
      <BlurFade delay={0}>
        <Link
          href="/seeker"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
          style={{ color: "var(--c-accent)", minHeight: 40 }}
        >
          ← Back to browse
        </Link>
      </BlurFade>

      <BlurFade delay={0.06}>
        <div className="mb-1 flex items-start justify-between gap-2">
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight">{service.title}</h1>
          {service.custom && (
            <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
              ✨ custom service
            </span>
          )}
        </div>
        <div className="mb-4 text-xs" style={{ color: "var(--c-text-2)" }}>
          {service.categoryLabel} · by {service.providerName}
        </div>
      </BlurFade>

      <BlurFade delay={0.12}>
        <div className="cc-card mb-3">
          <div className="mb-2.5 text-[28px] font-semibold tracking-tight">
            <AnimatedNumber value={service.rateAmount} prefix="₱" />
            <span className="ml-1.5 text-sm font-normal" style={{ color: "var(--c-text-3)" }}>
              {RATE_TYPE_LABELS[service.rateType]}
              {service.negotiable && " · negotiable"}
            </span>
          </div>
          {service.description && (
            <p className="mb-2.5 text-sm leading-relaxed">{service.description}</p>
          )}
          <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
            📍 {service.barangay}, {service.city} · {LEAD_TIME_LABELS[service.leadTime]}
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.18}>
        {profile.role === "provider" ? (
          <div className="cc-card text-xs" style={{ color: "var(--c-text-2)" }}>
            You&apos;re signed in as a provider — switch to a seeker account to book.
          </div>
        ) : (
          <RequestBookingForm
            serviceId={service.id}
            rate={`₱${service.rateAmount.toLocaleString("en-PH")} ${RATE_TYPE_LABELS[service.rateType as RateType]}`}
          />
        )}
      </BlurFade>

      <BlurFade delay={0.24}>
        <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
          Payment is arranged directly with your provider (cash, GCash, Maya) —
          Community Connect never holds your money. Agree on the price before the
          work starts.
        </p>
      </BlurFade>
    </div>
  );
}
