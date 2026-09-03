import Link from "next/link";
import type { Metadata } from "next";
import { WORK_CATEGORIES, getWorkCategory } from "@/lib/catalog";
import { listOpenAds, salaryLine } from "@/lib/trabaho";
import { BlurFade } from "@/components/mp/blur-fade";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = {
  title: "Trabaho — local hiring · Community Connect",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
};

export default async function TrabahoPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; salary?: string }>;
}) {
  const sp = await searchParams;
  const category = sp.category ? getWorkCategory(sp.category) : undefined;
  const salaryOnly = sp.salary === "1";
  let ads = await listOpenAds(category?.slug);
  if (salaryOnly) ads = ads.filter((a) => a.salaryMin != null);

  const qs = (opts: { category?: string; salary?: boolean }) => {
    const params = new URLSearchParams();
    if (opts.category) params.set("category", opts.category);
    if (opts.salary) params.set("salary", "1");
    const s = params.toString();
    return s ? `/trabaho?${s}` : "/trabaho";
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <BackLink href="/" label="Home" />
      <BlurFade delay={0}>
        <h1 className="mb-1 text-[24px] font-semibold tracking-tight">💼 Trabaho</h1>
        <p className="mb-1 text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Households and small shops hiring locally — yaya, househelp, store
          helpers and more.
        </p>
        <p className="mb-5 text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
          Workers NEVER pay to apply. If anyone asks for a fee, report them.
          Philippines jobs only.
        </p>
      </BlurFade>

      <BlurFade delay={0.05}>
        <div className="mb-3 flex flex-col gap-2">
          <Link href="/trabaho/post" className="cc-btn cc-btn-primary">
            Hiring? Post a job — free
          </Link>
          <Link href="/trabaho/my" className="cc-btn cc-btn-secondary">
            My ads &amp; applications
          </Link>
        </div>
      </BlurFade>

      <BlurFade delay={0.08}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Link href={qs({ salary: salaryOnly })} className={`cc-chip ${!category ? "cc-chip-active" : ""}`}>
            All
          </Link>
          <Link
            href={qs({ category: category?.slug, salary: !salaryOnly })}
            className={`cc-chip ${salaryOnly ? "cc-chip-active" : ""}`}
          >
            💰 Salary shown
          </Link>
          {WORK_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={qs({ category: cat.slug, salary: salaryOnly })}
              className={`cc-chip ${category?.slug === cat.slug ? "cc-chip-active" : ""}`}
            >
              <span className="text-sm leading-none">{cat.emoji}</span> {cat.label}
            </Link>
          ))}
        </div>
      </BlurFade>

      <div className="flex flex-col gap-3">
        {ads.length === 0 && (
          <BlurFade delay={0.1}>
            <div className="cc-card text-center">
              <div className="mb-1.5 text-sm font-medium">
                {category ? `No open ${category.label.toLowerCase()} jobs` : "No open jobs right now"}
              </div>
              <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                New job ads appear here — or post one yourself, it&apos;s free.
              </div>
            </div>
          </BlurFade>
        )}

        {ads.map((ad, i) => (
          <BlurFade key={ad.id} delay={0.1 + Math.min(i, 6) * 0.05} inView>
            <Link href={`/trabaho/${ad.id}`} className="cc-card-interactive block">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 text-[15px] font-semibold">{ad.title}</div>
                <span
                  className="cc-badge"
                  style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}
                >
                  ✅ verified
                </span>
              </div>
              <div className="mb-1 text-xs" style={{ color: "var(--c-text-2)" }}>
                {getWorkCategory(ad.categorySlug)?.emoji} {getWorkCategory(ad.categorySlug)?.label} ·{" "}
                {ad.posterType === "business" ? "🏪 Small business" : "🏠 Household"} ·{" "}
                {EMPLOYMENT_LABELS[ad.employmentType] ?? ad.employmentType}
              </div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className={`text-sm font-semibold cc-num ${ad.salaryMin == null ? "font-normal" : ""}`} style={ad.salaryMin == null ? { color: "var(--c-text-3)" } : {}}>
                  {salaryLine(ad) ?? "Salary not shown"}
                </span>
                <span className="text-[11px]" style={{ color: "var(--c-text-3)" }}>
                  📍 {ad.barangay}
                </span>
              </div>
              {ad.schedule && (
                <div className="text-[11px]" style={{ color: "var(--c-text-3)" }}>
                  🗓 {ad.schedule}
                </div>
              )}
            </Link>
          </BlurFade>
        ))}
      </div>

      <BlurFade delay={0.16}>
        <p className="mt-5 text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
          Community Connect is a listings venue only — not a recruitment agency.
          Wages and employment terms are agreed directly between you and the
          employer. Never pay anyone to get a job.
        </p>
      </BlurFade>
    </div>
  );
}
