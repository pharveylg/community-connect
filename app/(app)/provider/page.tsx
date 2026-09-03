import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { getProviderServices } from "@/lib/firestore";
import { listProviderBookings } from "@/lib/bookings";
import { allowanceFor } from "@/lib/wallet";
import { nextTrustTier, trustBadgeStyle, trustTier, trustSummaryLine } from "@/lib/trust";
import { effectiveVerification } from "@/lib/verifications";
import { listOpenJobPosts } from "@/lib/jobboard";
import { listOpenAds } from "@/lib/trabaho";
import { acceptBookingAction, declineBookingAction } from "@/app/actions/bookings";
import { toggleServiceActiveAction } from "@/app/actions/services";
import {
  EXTRA_ACCEPT_FEE_PESOS,
  FREE_MAX_ACTIVE_SERVICES,
  FREE_MONTHLY_ACCEPTS,
  LEAD_TIME_LABELS,
  formatPeso,
  formatRate,
} from "@/lib/catalog";
import { BlurFade } from "@/components/mp/blur-fade";
import { AnimatedNumber } from "@/components/mp/animated-number";

export default async function ProviderHomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getCurrentProfile();
  if (profile.role === "seeker") redirect("/seeker");

  const params = await searchParams;
  const banner = typeof params.accepted === "string"
    ? "Booking accepted — the seeker has been notified."
    : typeof params.declined === "string"
      ? "Booking declined."
      : typeof params.error === "string"
        ? params.error
        : null;

  const [services, bookings, jobPosts, jobAds] = await Promise.all([
    getProviderServices(profile.uid),
    listProviderBookings(profile.uid),
    listOpenJobPosts(),
    listOpenAds(),
  ]);
  const allowance = allowanceFor(profile);
  const pending = bookings.filter((b) => b.status === "pending");
  const accepted = bookings.filter((b) => b.status === "accepted");
  const activeCount = services.filter((s) => s.active).length;
  const atCap = activeCount >= FREE_MAX_ACTIVE_SERVICES;
  const usedPct = Math.round((allowance.used / FREE_MONTHLY_ACCEPTS) * 100);

  return (
    <div className="mx-auto w-full max-w-sm">
      <BlurFade delay={0}>
        <p className="mb-1 text-xs font-medium" style={{ color: "var(--c-text-2)" }}>
          Provider dashboard
        </p>
        <h1 className="mb-5 text-[26px] font-semibold tracking-tight">{profile.fullName}</h1>
      </BlurFade>

      {banner && (
        <BlurFade delay={0.04}>
          <div
            className="cc-card mb-4 text-xs leading-relaxed"
            style={{ boxShadow: "0 0 0 1px var(--c-accent), var(--shadow-border)" }}
          >
            {banner}
          </div>
        </BlurFade>
      )}

      {/* Wallet / allowance */}
      <BlurFade delay={0.07}>
        <Link
          href="/provider/credits"
          className="mb-6 block rounded-[24px] p-5 text-white"
          style={{
            background: "linear-gradient(135deg,#0b4480 0%,#0e7a5f 130%)",
            boxShadow: "var(--shadow-btn)",
          }}
        >
          <div className="flex items-end justify-between">
            <div>
              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.12em] opacity-75">
                Credit balance
              </div>
              <div className="text-[32px] font-semibold leading-none tracking-tight">
                <AnimatedNumber value={profile.credits} prefix="₱" />
              </div>
            </div>
            <div className="text-right">
              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.12em] opacity-75">
                Free accepts
              </div>
              <div className="text-[32px] font-semibold leading-none tracking-tight cc-num">
                {allowance.freeRemaining}
                <span className="text-base font-normal opacity-70"> / {FREE_MONTHLY_ACCEPTS}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 cc-progress" style={{ color: "#ffffff" }}>
            <div style={{ width: `${100 - usedPct}%`, opacity: 0.9 }} />
          </div>
          <div className="mt-2.5 text-xs leading-relaxed opacity-80">
            After your free accepts: {formatPeso(EXTRA_ACCEPT_FEE_PESOS)} per accept from credits →
          </div>
        </Link>
      </BlurFade>

      {/* Job board preview */}
      <BlurFade delay={0.075}>
        <Link href="/provider/jobs" className="cc-card-interactive mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              🎯 Open service requests
              {jobPosts.length > 0 && (
                <span className="cc-num ml-1.5 font-normal" style={{ color: "var(--c-accent)" }}>
                  ({jobPosts.length})
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              {jobPosts.length > 0
                ? jobPosts[0].title
                : "No open requests right now — check back soon"}
            </p>
          </div>
          <span className="text-lg">→</span>
        </Link>
      </BlurFade>

      {/* Trabaho work card */}
      <BlurFade delay={0.09}>
        <Link href="/trabaho" className="cc-card-interactive mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              💼 Looking for steady work?
              {jobAds.length > 0 && (
                <span className="cc-num ml-1.5 font-normal" style={{ color: "var(--c-accent)" }}>
                  ({jobAds.length})
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              {jobAds.length > 0
                ? jobAds[0].title
                : "Local jobs: yaya, helper, store staff — applying is always free"}
            </p>
          </div>
          <span className="text-lg">→</span>
        </Link>
      </BlurFade>

      {/* Verification status */}
      <BlurFade delay={0.08}>
        {(() => {
          const vs = effectiveVerification(profile.verificationStatus, profile.verifiedUntil);
          return (
            <div className="cc-card mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="mb-0.5 flex items-center gap-2">
                  {vs === "verified" ? (
                    <span className="text-sm font-semibold">✅ ID Verified</span>
                  ) : vs === "pending" ? (
                    <span className="text-sm font-semibold">⏳ ID under review</span>
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: "var(--c-text-2)" }}>
                      Not ID-verified yet
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                  {vs === "verified"
                    ? `Renews by ${profile.verifiedUntil?.toLocaleDateString("en-PH") ?? "—"} — clients see your badge.`
                    : "Optional & free: an admin-reviewed ✅ badge that reassures clients. You can work without it."}
                </p>
              </div>
              <Link
                href="/verification"
                className="cc-btn cc-btn-secondary"
                style={{ width: "auto", minHeight: 38, fontSize: 12.5, padding: "0 14px", flexShrink: 0 }}
              >
                {vs === "verified" ? "View" : vs === "pending" ? "Status" : "Start"}
              </Link>
            </div>
          );
        })()}
      </BlurFade>

      {/* Trust status */}
      <BlurFade delay={0.09}>
        {(() => {
          const tier = trustTier(profile.completedCount, profile.vouches);
          const next = nextTrustTier(tier.key);
          const style = trustBadgeStyle(tier.key);
          return (
            <div className="cc-card mb-5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="cc-badge" style={{ background: style.background, color: style.color }}>
                  {tier.emoji} {tier.label}
                </span>
                <span className="text-[11px]" style={{ color: "var(--c-text-3)" }}>
                  {trustSummaryLine(profile.completedCount, profile.vouches)}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                {tier.description}
                {next
                  ? ` Next level (${next.label} ${next.emoji}) at ${next.requires.jobs} completed jobs or ${next.requires.vouches} client vouches.`
                  : " You're at the top level — suki na!"}
              </p>
            </div>
          );
        })()}
      </BlurFade>

      {/* Booking requests */}
      <BlurFade delay={0.1}>
        <h2 className="mb-2.5 text-sm font-semibold">
          Booking requests{" "}
          {pending.length > 0 && (
            <span
              className="cc-badge ml-1"
              style={{ background: "#fdf3dc", color: "#8a5a00" }}
            >
              {pending.length} new
            </span>
          )}
        </h2>
      </BlurFade>
      <div className="mb-6 flex flex-col gap-3">
        {pending.length === 0 && (
          <BlurFade delay={0.12}>
            <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
              No pending requests right now.
            </div>
          </BlurFade>
        )}
        {pending.map((b, i) => (
          <BlurFade key={b.id} delay={0.12 + i * 0.07}>
            <div className="cc-card">
              <div className="mb-1 text-[15px] font-semibold">{b.serviceTitle}</div>
              <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
                From {b.seekerName} · <span className="cc-num">{b.preferredDate}</span>
                {b.preferredTime && ` · ${b.preferredTime}`} · {formatRate(b.rateAmount, b.rateType)}
              </div>
              {b.message && (
                <p className="mb-3 text-[13px] leading-relaxed">“{b.message}”</p>
              )}
              <div className="flex gap-2">
                <form action={acceptBookingAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button
                    type="submit"
                    className="cc-btn cc-btn-primary"
                    style={{ width: "auto", minHeight: 40, fontSize: 13, padding: "0 16px" }}
                  >
                    {allowance.freeRemaining > 0
                      ? "Accept (free)"
                      : `Accept (${formatPeso(EXTRA_ACCEPT_FEE_PESOS)})`}
                  </button>
                </form>
                <form action={declineBookingAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button
                    type="submit"
                    className="cc-btn cc-btn-secondary"
                    style={{ width: "auto", minHeight: 40, fontSize: 13, padding: "0 16px" }}
                  >
                    Decline
                  </button>
                </form>
              </div>
            </div>
          </BlurFade>
        ))}
      </div>

      {/* Accepted jobs */}
      {accepted.length > 0 && (
        <div className="mb-6">
          <BlurFade delay={0.1}>
            <h2 className="mb-2.5 text-sm font-semibold">Accepted jobs ({accepted.length})</h2>
          </BlurFade>
          <div className="flex flex-col gap-2.5">
            {accepted.map((b, i) => (
              <BlurFade key={b.id} delay={0.12 + i * 0.06}>
                <div className="cc-card">
                  <div className="text-sm font-semibold">{b.serviceTitle}</div>
                  <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                    {b.seekerName} · <span className="cc-num">{b.preferredDate}</span>
                    {b.preferredTime && ` · ${b.preferredTime}`}
                  </div>
                  <div className="mt-1.5 text-xs" style={{ color: "var(--c-text-3)" }}>
                    Agree on payment directly (cash, GCash, Maya).
                    {b.feeCharged > 0 && ` · ${formatPeso(b.feeCharged)} accept fee charged.`}
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      <BlurFade delay={0.1}>
        <h2 className="mb-2.5 text-sm font-semibold">
          Services{" "}
          <span className="cc-num font-normal" style={{ color: "var(--c-text-3)" }}>
            ({activeCount} active)
          </span>
        </h2>
      </BlurFade>
      <div className="mb-4 flex flex-col gap-3">
        {services.length === 0 && (
          <BlurFade delay={0.12}>
            <div className="cc-card text-center">
              <div className="mb-3 text-xs" style={{ color: "var(--c-text-2)" }}>
                No services yet — create your first listing.
              </div>
              <Link href="/provider/services/new" className="cc-btn cc-btn-primary">
                ＋ Create a service
              </Link>
            </div>
          </BlurFade>
        )}
        {services.map((service, i) => (
          <BlurFade key={service.id} delay={0.12 + i * 0.06}>
            <div className="cc-card">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[15px] font-semibold">{service.title}</div>
                  <div className="mt-0.5 text-xs" style={{ color: "var(--c-text-2)" }}>
                    {service.categoryLabel}
                    {service.custom && (
                      <span
                        className="cc-badge ml-1.5"
                        style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}
                      >
                        ✨ custom
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="cc-badge"
                  style={
                    service.active
                      ? { background: "var(--c-success-light)", color: "var(--c-success)" }
                      : { background: "var(--c-surface-2)", color: "var(--c-text-2)" }
                  }
                >
                  {service.active ? "Active" : "Paused"}
                </span>
              </div>
              <div className="mb-2 text-[15px] font-semibold cc-num">
                {formatRate(service.rateAmount, service.rateType)}
              </div>
              <div className="mb-3 text-xs" style={{ color: "var(--c-text-2)" }}>
                📍 {service.barangay}, {service.city} · {LEAD_TIME_LABELS[service.leadTime]}
                {service.negotiable && " · Rate negotiable"}
              </div>
              <form action={toggleServiceActiveAction}>
                <input type="hidden" name="serviceId" value={service.id} />
                <button
                  type="submit"
                  className="cc-btn cc-btn-secondary"
                  style={{ width: "auto", minHeight: 36, fontSize: 12, padding: "0 12px" }}
                >
                  {service.active ? "Pause" : "Resume"}
                </button>
              </form>
            </div>
          </BlurFade>
        ))}
      </div>

      {services.length > 0 && (
        <BlurFade delay={0.1}>
          <Link
            href="/provider/services/new"
            className={`cc-btn mb-4 ${atCap ? "cc-btn-secondary" : "cc-btn-primary"}`}
          >
            {atCap ? "＋ New service (free slots full — pause one above)" : "＋ Create another service"}
          </Link>
        </BlurFade>
      )}

      <BlurFade delay={0.12} inView>
        <div className="cc-card">
          <div className="mb-1.5 text-sm font-semibold">💳 Credits &amp; top-ups</div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
            Send GCash/Maya/bank transfer to the platform account, then submit the
            reference number — an admin confirms and your credits appear.{" "}
            <Link href="/provider/credits" className="font-semibold" style={{ color: "var(--c-accent)" }}>
              Top up →
            </Link>
          </p>
        </div>
      </BlurFade>
    </div>
  );
}
