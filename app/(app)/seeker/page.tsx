import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { browseServices, getProviderTrust } from "@/lib/firestore";
import { getVouchedProviderUids, listSeekerBookings, type Booking } from "@/lib/bookings";
import { trustBadgeStyle, trustTier, trustSummaryLine } from "@/lib/trust";
import { effectiveVerification } from "@/lib/verifications";
import {
  SERVICE_CATEGORIES,
  LEAD_TIME_LABELS,
  formatRate,
  getCategory,
} from "@/lib/catalog";
import {
  cancelBookingAction,
  completeBookingAction,
  vouchForProviderAction,
} from "@/app/actions/bookings";
import { listMyJobPosts, listPostOffers } from "@/lib/jobboard";
import { BlurFade } from "@/components/mp/blur-fade";

const STATUS_STYLES: Record<Booking["status"], { bg: string; fg: string; label: string }> = {
  pending: { bg: "#fdf3dc", fg: "#8a5a00", label: "Waiting for provider" },
  accepted: { bg: "var(--c-success-light)", fg: "var(--c-success)", label: "Accepted ✓" },
  declined: { bg: "var(--c-danger-light)", fg: "var(--c-danger)", label: "Declined" },
  cancelled: { bg: "var(--c-surface-2)", fg: "var(--c-text-2)", label: "Cancelled" },
  completed: { bg: "var(--c-accent-light)", fg: "var(--c-accent)", label: "Completed ✓" },
};

export default async function SeekerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getCurrentProfile();
  if (profile.role === "provider") redirect("/provider");

  const params = await searchParams;
  const rawCategory = typeof params.category === "string" ? params.category : undefined;
  const category = rawCategory ? getCategory(rawCategory) : undefined;
  const verifiedOnly = typeof params.verified === "string";
  const banner = typeof params.booked === "string"
    ? "Request sent — you'll see the provider's response below."
    : typeof params.cancelled === "string"
      ? "Request cancelled."
      : typeof params.done === "string"
        ? "Marked as done — the provider's completed-jobs count went up. Vouch for them below if they did well!"
        : typeof params.vouched === "string"
          ? "Vouch recorded — you just boosted their standing. Salamat!"
          : typeof params.error === "string"
            ? params.error
            : null;

  const [services, bookings, jobPosts] = await Promise.all([
    browseServices(category?.slug),
    listSeekerBookings(profile.uid),
    listMyJobPosts(profile.uid),
  ]);
  const openPosts = jobPosts.filter((p) => p.status === "open");
  const openOfferCount = (
    await Promise.all(openPosts.map((p) => listPostOffers(p.id)))
  ).reduce((n, offers) => n + offers.filter((o) => o.status === "pending").length, 0);
  const activeBookings = bookings.filter((b) => b.status === "pending" || b.status === "accepted");
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const [trust, vouched] = await Promise.all([
    getProviderTrust(services.map((x) => x.providerUid)),
    getVouchedProviderUids(
      profile.uid,
      bookings.map((b) => b.providerUid)
    ),
  ]);
  const isVerified = (uid: string) => {
    const t = trust.get(uid);
    return t ? effectiveVerification(t.verificationStatus, t.verifiedUntil) === "verified" : false;
  };
  const visibleServices = verifiedOnly
    ? services.filter((x) => isVerified(x.providerUid))
    : services;

  return (
    <div className="mx-auto w-full max-w-sm">
      <BlurFade delay={0}>
        <p className="mb-1 text-xs font-medium" style={{ color: "var(--c-text-2)" }}>
          Good morning 👋 {profile.bookingFor === "dependent" ? "· booking for a family member" : ""}
        </p>
        <h1 className="mb-5 text-[26px] font-semibold tracking-tight">{profile.fullName}</h1>
      </BlurFade>

      <BlurFade delay={0.03}>
        <Link href="/seeker/requests" className="cc-card-interactive mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">🎯 Post a request</div>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              {openPosts.length > 0
                ? `${openPosts.length} open · ${openOfferCount} offer${openOfferCount === 1 ? "" : "s"} from verified providers`
                : "Can't find it in browse? Describe the job — verified providers send offers."}
            </p>
          </div>
          <span className="text-lg">→</span>
        </Link>
      </BlurFade>

      {banner && (
        <BlurFade delay={0.05}>
          <div
            className="cc-card mb-4 text-xs leading-relaxed"
            style={{ boxShadow: "0 0 0 1px var(--c-accent), var(--shadow-border)" }}
          >
            {banner}
          </div>
        </BlurFade>
      )}

      {activeBookings.length > 0 && (
        <div className="mb-6">
          <BlurFade delay={0.08}>
            <h2 className="mb-2.5 text-sm font-semibold">My bookings</h2>
          </BlurFade>
          <div className="flex flex-col gap-2.5">
            {activeBookings.map((b, i) => {
              const st = STATUS_STYLES[b.status];
              return (
                <BlurFade key={b.id} delay={0.1 + i * 0.06}>
                  <div className="cc-card">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold">{b.serviceTitle}</div>
                      <span className="cc-badge" style={{ background: st.bg, color: st.fg }}>
                        {st.label}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                      {b.providerName} · <span className="cc-num">{b.preferredDate}</span>
                      {b.preferredTime && ` · ${b.preferredTime}`}
                    </div>
                    {b.status === "pending" && (
                      <form action={cancelBookingAction} className="mt-2.5">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button
                          type="submit"
                          className="cc-btn cc-btn-ghost"
                          style={{ width: "auto", minHeight: 36, fontSize: 12.5, padding: "0 12px" }}
                        >
                          Cancel request
                        </button>
                      </form>
                    )}
                    {b.status === "accepted" && (
                      <>
                        <div className="mt-1.5 text-xs" style={{ color: "var(--c-text-3)" }}>
                          Agree on payment directly with {b.providerName} (cash, GCash, Maya).
                        </div>
                        <form action={completeBookingAction} className="mt-2.5">
                          <input type="hidden" name="bookingId" value={b.id} />
                          <button
                            type="submit"
                            className="cc-btn cc-btn-primary"
                            style={{ width: "auto", minHeight: 36, fontSize: 12.5, padding: "0 14px" }}
                          >
                            ✓ Mark as done
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </BlurFade>
              );
            })}
          </div>
        </div>
      )}

      <BlurFade delay={0.12}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Link
            href="/seeker"
            className={`cc-chip ${!category ? "cc-chip-active" : ""}`}
          >
            All
          </Link>
          <Link
            href={`/seeker${category ? `?category=${category.slug}&` : "?"}verified=1`}
            className={`cc-chip ${verifiedOnly ? "cc-chip-active" : ""}`}
          >
            ✅ Verified only
          </Link>
          {SERVICE_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/seeker?category=${cat.slug}${verifiedOnly ? "&verified=1" : ""}`}
              className={`cc-chip ${category?.slug === cat.slug ? "cc-chip-active" : ""}`}
            >
              <span className="text-sm leading-none">{cat.emoji}</span> {cat.label}
            </Link>
          ))}
        </div>
      </BlurFade>

      <div className="flex flex-col gap-3">
        {services.length === 0 && (
          <BlurFade delay={0.15}>
            <div className="cc-card text-center">
              <div className="mb-1.5 text-sm font-medium">
                {category ? `No ${category.label.toLowerCase()} services yet` : "No services listed yet"}
              </div>
              <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                {verifiedOnly
                  ? "No ID-verified providers here yet — try clearing the filter, or check a provider's completed jobs and vouches."
                  : "Providers are signing up — check another category, or come back soon."}
              </div>
            </div>
          </BlurFade>
        )}

        {visibleServices.map((service, i) => (
          <BlurFade key={service.id} delay={0.04 * i} inView>
            <Link href={`/seeker/services/${service.id}`} className="cc-card-interactive block">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="text-[15px] font-semibold">{service.title}</div>
                {service.custom && (
                  <span
                    className="cc-badge"
                    style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}
                  >
                    ✨ custom
                  </span>
                )}
              </div>
              <div className="mb-1 text-xs" style={{ color: "var(--c-text-2)" }}>
                {service.categoryLabel} · by {service.providerName}
              </div>
              {(() => {
                const t = trust.get(service.providerUid);
                if (!t) return null;
                const tier = trustTier(t.completedCount, t.vouches);
                return (
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="cc-badge" style={trustBadgeStyle(tier.key)}>
                      {tier.emoji} {tier.label}
                    </span>
                    {isVerified(service.providerUid) && (
                      <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
                        ✅ ID Verified
                      </span>
                    )}
                    <span className="text-[11px]" style={{ color: "var(--c-text-3)" }}>
                      {trustSummaryLine(t.completedCount, t.vouches)}
                    </span>
                  </div>
                );
              })()}
              <div className="mb-2.5 text-[15px] font-semibold cc-num">
                {formatRate(service.rateAmount, service.rateType)}
                {service.negotiable && (
                  <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--c-text-3)" }}>
                    negotiable
                  </span>
                )}
              </div>
              {service.description && (
                <p className="mb-2.5 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                  {service.description}
                </p>
              )}
              <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
                📍 {service.barangay}, {service.city} · {LEAD_TIME_LABELS[service.leadTime]}
              </div>
            </Link>
          </BlurFade>
        ))}
      </div>

      {completedBookings.length > 0 && (
        <div className="mt-6">
          <BlurFade delay={0.08}>
            <h2 className="mb-2.5 text-sm font-semibold">Past jobs</h2>
          </BlurFade>
          <div className="flex flex-col gap-2.5">
            {completedBookings.map((b, i) => {
              const already = vouched.has(b.providerUid);
              return (
                <BlurFade key={b.id} delay={0.1 + i * 0.06}>
                  <div className="cc-card">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold">{b.serviceTitle}</div>
                      <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
                        Completed ✓
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                      {b.providerName} · <span className="cc-num">{b.preferredDate}</span>
                    </div>
                    {!already ? (
                      <form action={vouchForProviderAction} className="mt-2.5">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button
                          type="submit"
                          className="cc-btn cc-btn-secondary"
                          style={{ width: "auto", minHeight: 36, fontSize: 12.5, padding: "0 14px" }}
                        >
                          🤝 Vouch for {b.providerName.split(" ")[0]}
                        </button>
                      </form>
                    ) : (
                      <div className="mt-2 text-xs" style={{ color: "var(--c-text-3)" }}>
                        You vouched for this provider 🤝
                      </div>
                    )}
                  </div>
                </BlurFade>
              );
            })}
          </div>
        </div>
      )}

      <BlurFade delay={0.1} inView>
        <div className="cc-card mt-5">
          <div className="mb-1.5 text-sm font-semibold">🧾 How payment works</div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
            Community Connect connects you with providers — payments are arranged
            directly with them (cash, GCash, Maya). Agree on the price and payment
            method before the work starts.
          </p>
        </div>
      </BlurFade>
    </div>
  );
}
