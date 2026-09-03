import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUid } from "@/lib/dal";
import { getProfile } from "@/lib/firestore";
import { getJobAd, getInterest, salaryLine, adIsOpen } from "@/lib/trabaho";
import { getWorkCategory } from "@/lib/catalog";
import { withdrawInterestAction, reportAdAction } from "@/app/actions/trabaho";
import { BlurFade } from "@/components/mp/blur-fade";
import { InterestForm } from "./interest-form";

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
};

const INTEREST_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  interested: { bg: "var(--c-accent-light)", fg: "var(--c-accent)", label: "Interest sent" },
  shortlisted: { bg: "#e7f5ee", fg: "#0e7a5f", label: "Shortlisted 🎉" },
  passed: { bg: "#f1f3f6", fg: "var(--c-text-2)", label: "Not chosen" },
  withdrawn: { bg: "#f1f3f6", fg: "var(--c-text-2)", label: "Withdrawn" },
};

export default async function TrabahoAdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ad = await getJobAd(id);
  if (!ad) notFound();

  const uid = await getSessionUid();
  const profile = uid ? await getProfile(uid) : null;
  const isOwn = profile != null && ad.posterUid === profile.uid;
  const myInterest = profile ? await getInterest(ad.id, profile.uid) : null;
  const fresh = adIsOpen(ad);
  const cat = getWorkCategory(ad.categorySlug);
  const nextPath = `/trabaho/${ad.id}`;

  return (
    <div className="mx-auto w-full max-w-sm">
      <BlurFade delay={0}>
        <Link
          href="/trabaho"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
          style={{ color: "var(--c-accent)", minHeight: 40 }}
        >
          ← Back to Trabaho
        </Link>
      </BlurFade>

      {sp.reported && (
        <BlurFade delay={0.02}>
          <div className="cc-card mb-4 text-xs leading-relaxed" style={{ boxShadow: "0 0 0 1px var(--c-accent), var(--shadow-border)" }}>
            Thanks — our team will review this ad.
          </div>
        </BlurFade>
      )}
      {typeof sp.error === "string" && (
        <BlurFade delay={0.02}>
          <div className="cc-error mb-4">{sp.error}</div>
        </BlurFade>
      )}

      <BlurFade delay={0.06}>
        <div className="mb-1 flex items-start justify-between gap-2">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{ad.title}</h1>
          {ad.status !== "open" && (
            <span className="cc-badge" style={{ background: "#f1f3f6", color: "var(--c-text-2)" }}>
              {ad.status === "filled" ? "Filled" : "Closed"}
            </span>
          )}
        </div>
        <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
          {cat?.emoji} {cat?.label} · {ad.posterType === "business" ? "🏪 Small business" : "🏠 Household"} ·{" "}
          {EMPLOYMENT_LABELS[ad.employmentType] ?? ad.employmentType}
        </div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
            ✅ Posted by {ad.posterName.split(" ")[0]} (ID-verified)
          </span>
        </div>
        <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
          📍 {ad.barangay}, {ad.city}
        </div>
      </BlurFade>

      <BlurFade delay={0.12}>
        <div className="cc-card mb-3">
          <div className="mb-2 text-sm font-semibold cc-num">
            {salaryLine(ad) ?? <span style={{ color: "var(--c-text-3)", fontWeight: 400 }}>Salary not shown — ask the employer</span>}
          </div>
          {ad.schedule && (
            <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
              🗓 {ad.schedule}
            </div>
          )}
          {ad.description && (
            <p className="text-sm leading-relaxed">{ad.description}</p>
          )}
        </div>
      </BlurFade>

      <BlurFade delay={0.18}>
        {isOwn ? (
          <div className="cc-card">
            <div className="mb-1.5 text-sm font-semibold">This is your ad</div>
            <Link href="/trabaho/my" className="text-xs font-semibold" style={{ color: "var(--c-accent)" }}>
              Manage applicants →
            </Link>
          </div>
        ) : !fresh || ad.status !== "open" ? (
          <div className="cc-card text-xs" style={{ color: "var(--c-text-2)" }}>
            This ad is no longer accepting interest.
          </div>
        ) : myInterest ? (
          <div className="cc-card">
            <span className="cc-badge" style={{ background: INTEREST_STYLES[myInterest.status]?.bg, color: INTEREST_STYLES[myInterest.status]?.fg }}>
              {INTEREST_STYLES[myInterest.status]?.label ?? myInterest.status}
            </span>
            {myInterest.status === "shortlisted" && (
              <div className="mt-2.5 text-sm">
                <div className="mb-0.5 text-xs" style={{ color: "var(--c-text-2)" }}>
                  You were shortlisted — contact each other:
                </div>
                <div className="font-semibold cc-num">📞 {myInterest.posterMobile}</div>
              </div>
            )}
            {(myInterest.status === "interested" || myInterest.status === "shortlisted") && (
              <form action={withdrawInterestAction} className="mt-3">
                <input type="hidden" name="adId" value={ad.id} />
                <button type="submit" className="cc-btn cc-btn-ghost" style={{ width: "auto", padding: "0 14px", minHeight: 36, fontSize: 12 }}>
                  Withdraw interest
                </button>
              </form>
            )}
          </div>
        ) : !uid ? (
          <div className="cc-card">
            <div className="mb-1 text-sm font-semibold">I&apos;m interested</div>
            <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              Create a free account (or log in) to express interest — applying is
              always free for workers.
            </p>
            <div className="flex flex-col gap-2">
              <Link href={`/register?next=${encodeURIComponent(nextPath)}`} className="cc-btn cc-btn-primary">
                Sign up — it&apos;s free
              </Link>
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="cc-btn cc-btn-secondary">
                I already have an account
              </Link>
            </div>
          </div>
        ) : (
          <InterestForm adId={ad.id} />
        )}
      </BlurFade>

      <BlurFade delay={0.24}>
        <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
          Meet in safe public places first, agree on wages and schedule in
          writing, and NEVER pay any fee to get a job — legitimate employers
          don&apos;t charge workers. Kasambahay hires: written contract, minimum
          wage, SSS/PhilHealth/Pag-IBIG are the employer&apos;s duty by law.
        </p>
        {!isOwn && profile && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium" style={{ color: "var(--c-text-2)" }}>
              ⚠ Report this ad
            </summary>
            <form action={reportAdAction} className="mt-2 flex flex-col gap-2">
              <input type="hidden" name="adId" value={ad.id} />
              <textarea
                name="reason"
                className="cc-input"
                style={{ minHeight: 60, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
                placeholder="What's wrong? (asking for fees, fake job, overseas recruitment…)"
                maxLength={300}
                required
              />
              <button type="submit" className="cc-btn cc-btn-secondary" style={{ minHeight: 38 }}>
                Send report
              </button>
            </form>
          </details>
        )}
      </BlurFade>
    </div>
  );
}
