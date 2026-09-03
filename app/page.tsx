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
import { PostRequestCta } from "@/components/post-request-cta";
import { RequestsBoard, type RequestRow } from "@/components/requests-board";
import { listOpenJobPosts } from "@/lib/jobboard";

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
  const openPosts = (await listOpenJobPosts()).slice(0, 6);
  const requests: RequestRow[] = openPosts.map((p) => ({
    id: p.id,
    title: p.title,
    category: getCategory(p.categorySlug)?.label ?? p.categorySlug,
    barangay: p.barangay,
    budget: p.budget ? `₱${p.budget.toLocaleString("en-PH")}` : "Open to quotes",
    when:
      p.whenNeeded === "flexible"
        ? "flexible"
        : (() => {
            const d = new Date(p.whenNeeded);
            return isNaN(d.getTime()) ? "soon" : d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
          })(),
    needsPro: p.needsPro,
  }));

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

      <div className="relative mx-auto w-full max-w-md px-5 pt-16 xl:max-w-6xl 2xl:max-w-7xl">
        {/* Category ticker — every service you can think of */}
        <BlurFade delay={0}>
          <div className="mb-5">
            <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--c-text-3)" }}>
              Every service you can think of
            </h2>
            <Marquee className="py-1">
              {SERVICE_CATEGORIES.map((cat) => (
                <span key={cat.slug} className="cc-chip">
                  <span className="text-base leading-none">{cat.emoji}</span> {cat.label}
                </span>
              ))}
            </Marquee>
            <p className="mt-2 text-center text-xs" style={{ color: "var(--c-text-3)" }}>
              Soon: 🛠 licensed pros — electricians, plumbers, aircon techs, certified caregivers — every credential verified.
            </p>
          </div>
        </BlurFade>

        {/* Auth links — opposite the brand, above the fold */}
        <BlurFade delay={0}>
          <div className="mb-4 flex items-center justify-end gap-3 text-xs font-semibold">
            <Link href="/register" style={{ color: "var(--c-accent)" }}>Create account</Link>
            <span style={{ color: "var(--c-text-3)" }}>·</span>
            <Link href="/login" style={{ color: "var(--c-accent)" }}>Log in</Link>
          </div>
        </BlurFade>

        <div className="lg:max-w-md">
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
            cash-on-hand services.{" "}
            <Link href="/how-it-works" className="font-semibold" style={{ color: "var(--c-accent)" }}>
              How it works →
            </Link>
          </p>
        </BlurFade>

        </div>


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


        <div className="mb-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

        {/* Open requests from neighbors — browse free, responding gates auth */}
        <BlurFade delay={0.33} inView>
          <div className="mb-10">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight">Requests</h2>
                <p className="mt-0.5 text-xs" style={{ color: "var(--c-text-2)" }}>
                  {requests.length} open request{requests.length === 1 ? "" : "s"} from your neighbors · quoting is free
                </p>
              </div>
            </div>
            <RequestsBoard requests={requests} />
          </div>
        </BlurFade>

        {/* Didn't find what they need? Let them post a request (anon → sign-up/log-in prompt). */}
        <BlurFade delay={0.34} inView>
          <PostRequestCta />
        </BlurFade>

        {/* Trabaho strip */}
        <BlurFade delay={0.36} inView>
          <div className="cc-card">
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

      </div>

      <div className="relative mx-auto w-full max-w-md px-5 pb-10 xl:max-w-6xl 2xl:max-w-7xl">
        <BlurFade delay={0.1} inView>
          <div className="mt-10 text-center">
            <Link href="/how-it-works" className="text-xs font-semibold" style={{ color: "var(--c-accent)" }}>
              New here? See how it works →
            </Link>
          </div>
        </BlurFade>
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
