import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUid } from "@/lib/dal";
import { getProfile, getServiceListing } from "@/lib/firestore";
import { trustBadgeStyle, trustTier, trustSummaryLine } from "@/lib/trust";
import { effectiveVerification } from "@/lib/verifications";
import { LEAD_TIME_LABELS, RATE_TYPE_LABELS, type RateType } from "@/lib/catalog";
import { BlurFade } from "@/components/mp/blur-fade";
import { AnimatedNumber } from "@/components/mp/animated-number";
import { RequestBookingForm } from "@/app/(app)/seeker/services/[id]/request-booking-form";
import { ReportContent } from "@/components/report-content";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const service = await getServiceListing(id);
  return { title: service ? `${service.title} · Community Connect` : "Community Connect" };
}

export default async function PublicServicePage({ params }: PageProps) {
  const { id } = await params;
  // Public page: a valid session unlocks the booking form; anonymous visitors
  // get the sign-up / log-in prompt instead. Never redirects (loop-safe).
  const uid = await getSessionUid();
  const profile = uid ? await getProfile(uid) : null;
  const service = await getServiceListing(id);
  if (!service || !service.active) notFound();
  const provider = await getProfile(service.providerUid);
  const providerVerified = provider
    ? effectiveVerification(provider.verificationStatus, provider.verifiedUntil) === "verified"
    : false;
  const backHref = profile?.role === "seeker" ? "/seeker" : "/";
  const nextPath = `/services/${service.id}`;

  return (
    <div className="mx-auto w-full max-w-sm md:max-w-md lg:max-w-4xl">
      <BlurFade delay={0}>
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
          style={{ color: "var(--c-accent)", minHeight: 40 }}
        >
          ← Back to browse
        </Link>
      </BlurFade>

      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-5">
        {/* Left: identity + details */}
        <div className="flex flex-col">
          <BlurFade delay={0.06}>
            <div className="mb-1 flex items-start justify-between gap-2">
              <h1 className="text-[24px] leading-tight font-semibold tracking-tight">{service.title}</h1>
              {service.custom && (
                <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
                  ✨ custom service
                </span>
              )}
            </div>
            <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
              {service.categoryLabel} · by {service.providerName}
            </div>
            {provider && (
              <div className="mb-4">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  {(() => {
                    const tier = trustTier(provider.completedCount, provider.vouches);
                    return (
                      <>
                        <span className="cc-badge" style={trustBadgeStyle(tier.key)}>
                          {tier.emoji} {tier.label}
                        </span>
                        {providerVerified && (
                          <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
                            ✅ ID Verified
                          </span>
                        )}
                        <span className="text-[11px]" style={{ color: "var(--c-text-3)" }}>
                          {trustSummaryLine(provider.completedCount, provider.vouches)}
                        </span>
                      </>
                    );
                  })()}
                </div>
                {!providerVerified && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                    ℹ️ This provider hasn&apos;t completed ID verification (it&apos;s
                    optional). You can still check their completed jobs and client
                    vouches. Agree on payment only when you&apos;re comfortable.
                  </p>
                )}
              </div>
            )}
          </BlurFade>

          <BlurFade delay={0.12}>
            <div className="cc-card">
              <p className="text-sm leading-relaxed">
                {service.description || "No description provided — message the provider when you book."}
              </p>
              <div className="mt-2.5 text-xs" style={{ color: "var(--c-text-3)" }}>
                📍 {service.barangay}, {service.city} · {LEAD_TIME_LABELS[service.leadTime]}
              </div>
            </div>
          </BlurFade>
        </div>

        {/* Right: rate + booking (sticky on desktop) */}
        <div className="mt-3 flex flex-col lg:mt-0 lg:sticky lg:top-20">
          <BlurFade delay={0.18}>
            <div className="cc-card mb-3">
              <div className="mb-2.5 text-[28px] font-semibold tracking-tight">
                <AnimatedNumber value={service.rateAmount} prefix="₱" />
                <span className="ml-1.5 text-sm font-normal" style={{ color: "var(--c-text-3)" }}>
                  {RATE_TYPE_LABELS[service.rateType]}
                  {service.negotiable && " · negotiable"}
                </span>
              </div>

              {!uid ? (
                <div>
                  <div className="mb-1 text-sm font-semibold">Book this service</div>
                  <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                    Create a free account to send a booking request — it takes under a
                    minute. Seekers never pay fees.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/register?next=${encodeURIComponent(nextPath)}`}
                      className="cc-btn cc-btn-primary"
                    >
                      Sign up — it&apos;s free
                    </Link>
                    <Link
                      href={`/login?next=${encodeURIComponent(nextPath)}`}
                      className="cc-btn cc-btn-secondary"
                    >
                      I already have an account
                    </Link>
                  </div>
                </div>
              ) : profile?.role === "seeker" ? (
                <RequestBookingForm
                  serviceId={service.id}
                  providerVerified={providerVerified}
                  rate={`₱${service.rateAmount.toLocaleString("en-PH")} ${RATE_TYPE_LABELS[service.rateType as RateType]}`}
                />
              ) : (
                <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                  You&apos;re signed in as a {profile?.role ?? "user"} — switch to a
                  seeker account to book this service.
                </div>
              )}
            </div>
          </BlurFade>

          <BlurFade delay={0.24}>
            <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
              Payment is arranged directly with your provider (cash, GCash, Maya) —
              Community Connect never holds your money. Agree on the price before the
              work starts.
            </p>
            {uid && uid !== service.providerUid && (
              <div className="mt-3">
                <ReportContent
                  targetType="listing"
                  targetId={service.id}
                  back={nextPath}
                  label="Report this listing"
                />
              </div>
            )}
          </BlurFade>
        </div>
      </div>
    </div>
  );
}
