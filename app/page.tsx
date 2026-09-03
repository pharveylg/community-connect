import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/firestore";
import { getSessionUid } from "@/lib/dal";
import { roleHomePath } from "@/lib/roles";
import {
  SERVICE_CATEGORIES,
  getCategory,
  formatRate,
} from "@/lib/catalog";
import { browseServices, getProviderTrust } from "@/lib/firestore";
import { listOpenAds, salaryLine } from "@/lib/trabaho";
import { trustBadgeStyle, trustTier, trustSummaryLine } from "@/lib/trust";
import { effectiveVerification } from "@/lib/verifications";
import { BlurFade } from "@/components/mp/blur-fade";
import { DotPattern } from "@/components/mp/dot-pattern";
import { Marquee } from "@/components/mp/marquee";
import { InstallButton } from "./install-button";

const STEPS = [
  {
    n: "01",
    title: "Browse — or post what you need",
    body: "Tricycle rides, tubero, cleaners, caregivers — filtered by barangay. Can't find it? Post the job and let verified providers come to you.",
  },
  {
    n: "02",
    title: "Send a booking request",
    body: "Pick a date, add a note, done. The provider accepts or declines — often within minutes.",
  },
  {
    n: "03",
    title: "Pay them directly",
    body: "Cash, GCash, or Maya — agreed between you two. No marks-ups, no app charges for seekers.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; verified?: string }>;
}) {
  // Soft check: an invalid/stale cookie just renders the landing page —
  // never a redirect (loops are impossible by construction).
  const uid = await getSessionUid();
  if (uid) {
    const profile = await getProfile(uid);
    if (!profile) redirect("/onboarding");
    if (!profile.role) redirect("/onboarding?step=role");
    redirect(roleHomePath(profile.role));
  }

  // Public marketplace: anonymous visitors browse ALL listings up front;
  // selecting a service leads to /services/[id] where booking prompts
  // sign-up / log-in (with ?next= returning them straight back).
  const sp = await searchParams;
  const category = sp.category ? getCategory(sp.category) : undefined;
  const verifiedOnly = sp.verified === "1";
  const services = await browseServices(category?.slug);
  const trust = await getProviderTrust([...new Set(services.map((x) => x.providerUid))]);
  const visibleServices = verifiedOnly
    ? services.filter((x) => {
        const t = trust.get(x.providerUid);
        return (
          t && effectiveVerification(t.verificationStatus, t.verifiedUntil) === "verified"
        );
      })
    : services;
  const jobAds = (await listOpenAds()).slice(0, 3);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <DotPattern className="text-[var(--c-text-3)] opacity-[0.16]" />

      {/* soft gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(11,68,128,.16), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(14,122,95,.14), transparent 70%)" }}
      />

      <div className="relative mx-auto w-full max-w-md px-5 pt-16">
        {/* Hero */}
        <BlurFade delay={0} duration={0.5}>
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] text-3xl"
            style={{ background: "linear-gradient(135deg,#0b4480,#0e7a5f)", boxShadow: "var(--shadow-btn)" }}
          >
            🤝
          </div>
        </BlurFade>

        <BlurFade delay={0.08}>
          <h1 className="mb-3 text-[34px] leading-[1.12] font-semibold tracking-tight">
            Your <span className="cc-gradient-text">barangay</span>,
            <br />
            one tap away.
          </h1>
        </BlurFade>

        <BlurFade delay={0.16}>
          <p className="mb-7 max-w-[38ch] text-[15px] leading-relaxed" style={{ color: "var(--c-text-2)" }}>
            Community Connect pairs seekers — including seniors and the family
            who care for them — with trusted nearby providers for everyday,
            cash-on-hand services.
          </p>
        </BlurFade>

        <BlurFade delay={0.24}>
          <div className="mb-9 flex flex-col gap-2.5">
            <Link href="/register" className="cc-btn cc-btn-primary">
              Create an account
            </Link>
            <Link href="/login" className="cc-btn cc-btn-secondary">
              Log in
            </Link>
          </div>
        </BlurFade>

        {/* Public marketplace */}
        <BlurFade delay={0.3} inView>
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight">Services near you</h2>
              <p className="mt-0.5 text-xs" style={{ color: "var(--c-text-2)" }}>
                {visibleServices.length} listing{visibleServices.length === 1 ? "" : "s"} · book
                free — pay the provider directly
              </p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <Link href="/" className={`cc-chip ${!category && !verifiedOnly ? "cc-chip-active" : ""}`}>
              All
            </Link>
            <Link
              href={`/?verified=1${category ? `&category=${category.slug}` : ""}`}
              className={`cc-chip ${verifiedOnly ? "cc-chip-active" : ""}`}
            >
              ✅ Verified only
            </Link>
            {SERVICE_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/?category=${cat.slug}${verifiedOnly ? "&verified=1" : ""}`}
                className={`cc-chip ${category?.slug === cat.slug ? "cc-chip-active" : ""}`}
              >
                <span className="text-sm leading-none">{cat.emoji}</span> {cat.label}
              </Link>
            ))}
          </div>
        </BlurFade>

        {/* Trabaho strip */}
        <BlurFade delay={0.3} inView>
          <div className="cc-card mb-10">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">💼 Trabaho — local hiring</div>
              <Link href="/trabaho" className="text-xs font-semibold" style={{ color: "var(--c-accent)" }}>
                See all →
              </Link>
            </div>
            {jobAds.length === 0 ? (
              <p className="mb-2 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                Households &amp; small shops hiring locally — yaya, store helpers,
                and more. Workers never pay to apply.
              </p>
            ) : (
              <div className="mb-2.5 flex flex-col gap-2">
                {jobAds.map((ad) => (
                  <Link key={ad.id} href={`/trabaho/${ad.id}`} className="flex items-baseline justify-between gap-2 rounded-[10px] px-2.5 py-2" style={{ background: "var(--c-surface)", boxShadow: "var(--shadow-border)" }}>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{ad.title}</span>
                    <span className="shrink-0 text-[11px] cc-num" style={{ color: "var(--c-text-3)" }}>
                      {salaryLine(ad) ?? "📍 " + ad.barangay}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/trabaho/post" className="text-xs font-semibold" style={{ color: "var(--c-accent)" }}>
              Hiring? Post a job — free (ID-verified posters) →
            </Link>
          </div>
        </BlurFade>

        <div className="mb-10 flex flex-col gap-3">
          {visibleServices.length === 0 && (
            <BlurFade delay={0.34} inView>
              <div className="cc-card text-center">
                <div className="mb-1.5 text-sm font-medium">
                  {category ? `No ${category.label.toLowerCase()} services yet` : "No services listed yet"}
                </div>
                <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                  Providers are signing up — check another category, or come back soon.
                </div>
              </div>
            </BlurFade>
          )}

          {visibleServices.map((service, i) => {
            const t = trust.get(service.providerUid);
            const tier = t ? trustTier(t.completedCount, t.vouches) : null;
            const verified = t
              ? effectiveVerification(t.verificationStatus, t.verifiedUntil) === "verified"
              : false;
            return (
              <BlurFade key={service.id} delay={0.32 + Math.min(i, 6) * 0.04} inView>
                <Link href={`/services/${service.id}`} className="cc-card-interactive block">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 text-[15px] font-semibold">{service.title}</div>
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
                  {tier && t && (
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="cc-badge" style={trustBadgeStyle(tier.key)}>
                        {tier.emoji} {tier.label}
                      </span>
                      {verified && (
                        <span
                          className="cc-badge"
                          style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}
                        >
                          ✅ ID Verified
                        </span>
                      )}
                      <span className="text-[11px]" style={{ color: "var(--c-text-3)" }}>
                        {trustSummaryLine(t.completedCount, t.vouches)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm font-semibold cc-num">
                      {formatRate(service.rateAmount, service.rateType)}
                      {service.negotiable && (
                        <span className="ml-1.5 text-[11px] font-normal" style={{ color: "var(--c-text-3)" }}>
                          negotiable
                        </span>
                      )}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--c-text-3)" }}>
                      📍 {service.barangay}
                    </div>
                  </div>
                </Link>
              </BlurFade>
            );
          })}
        </div>

        <BlurFade delay={0.34} inView>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--c-text-3)" }}>
            Every service you can think of
          </h2>
        </BlurFade>
      </div>

      {/* Category marquee */}
      <BlurFade delay={0.4} inView className="relative">
        <Marquee className="py-1">
          {SERVICE_CATEGORIES.map((cat) => (
            <span key={cat.slug} className="cc-chip">
              <span className="text-base leading-none">{cat.emoji}</span> {cat.label}
            </span>
          ))}
        </Marquee>
      </BlurFade>

      <BlurFade delay={0.44} inView className="relative">
        <p className="mt-3 px-5 text-center text-xs" style={{ color: "var(--c-text-3)" }}>
          Soon: 🛠 licensed pros — electricians, plumbers, aircon techs, certified caregivers —
          every credential verified.
        </p>
      </BlurFade>

      <div className="relative mx-auto w-full max-w-md px-5 pb-10">
        {/* How it works */}
        <BlurFade delay={0.1} inView>
          <h2 className="mt-12 mb-5 text-[22px] font-semibold tracking-tight">How it works</h2>
        </BlurFade>
        <div className="mb-12 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <BlurFade key={step.n} delay={0.14 + i * 0.1} inView>
              <div className="cc-card flex gap-4">
                <div
                  className="cc-num flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-sm font-bold"
                  style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}
                >
                  {step.n}
                </div>
                <div>
                  <div className="mb-1 text-[15px] font-semibold">{step.title}</div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                    {step.body}
                  </p>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.2} inView>
          <InstallButton />
        </BlurFade>

        <BlurFade delay={0.26} inView>
          <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
            Community Connect is a listing &amp; connectivity service. Payments
            are made directly between you and your provider (cash, GCash, Maya) —
            we never hold your money.
          </p>
        </BlurFade>
      </div>
    </div>
  );
}
