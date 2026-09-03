import Link from "next/link";
import { getSessionUid } from "@/lib/dal";
import { getProfile, getProviderTrust } from "@/lib/firestore";
import { trustBadgeStyle, trustTier, trustSummaryLine } from "@/lib/trust";
import { effectiveVerification } from "@/lib/verifications";
import { getWorkCategory } from "@/lib/catalog";
import {
  listMyAds,
  listAdInterests,
  listMyInterests,
  getJobAd,
  salaryLine,
  TRABAHO_AD_TTL_DAYS,
} from "@/lib/trabaho";
import {
  setAdStatusAction,
  decideInterestAction,
  withdrawInterestAction,
} from "@/app/actions/trabaho";
import { BlurFade } from "@/components/mp/blur-fade";
import { BackLink } from "@/components/back-link";

const AD_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  open: { bg: "var(--c-accent-light)", fg: "var(--c-accent)", label: "Open" },
  filled: { bg: "#e7f5ee", fg: "#0e7a5f", label: "Filled ✓" },
  closed: { bg: "#f1f3f6", fg: "var(--c-text-2)", label: "Closed" },
  expired: { bg: "#fdf3dc", fg: "#8a5a00", label: "Expired" },
};

const INTEREST_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  interested: { bg: "var(--c-accent-light)", fg: "var(--c-accent)", label: "Waiting" },
  shortlisted: { bg: "#e7f5ee", fg: "#0e7a5f", label: "Shortlisted 🎉" },
  passed: { bg: "#f1f3f6", fg: "var(--c-text-2)", label: "Not chosen" },
  withdrawn: { bg: "#f1f3f6", fg: "var(--c-text-2)", label: "Withdrawn" },
};

function adStatusKey(ad: { status: string; createdAt: Date | null }): string {
  if (ad.status === "open" && ad.createdAt) {
    const fresh = Date.now() - ad.createdAt.getTime() < TRABAHO_AD_TTL_DAYS * 86400000;
    if (!fresh) return "expired";
  }
  return ad.status;
}

export default async function MyTrabahoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const uid = await getSessionUid();

  if (!uid) {
    return (
      <div className="mx-auto w-full max-w-sm">
      <BackLink href="/trabaho" label="Trabaho" />
        <div className="cc-card">
          <div className="mb-2 text-sm font-semibold">My ads &amp; applications</div>
          <p className="mb-3 text-xs" style={{ color: "var(--c-text-2)" }}>
            Log in to manage your job ads and applications.
          </p>
          <Link href="/login?next=%2Ftrabaho%2Fmy" className="cc-btn cc-btn-primary">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const profile = await getProfile(uid);
  const myAds = await listMyAds(uid);
  const adsAndInterests = await Promise.all(
    myAds.map(async (ad) => ({ ad, interests: await listAdInterests(ad.id) }))
  );
  const workerUids = [
    ...new Set(adsAndInterests.flatMap(({ interests }) => interests.map((i) => i.workerUid))),
  ];
  const [trust, workerProfiles] = await Promise.all([
    getProviderTrust(workerUids),
    Promise.all(workerUids.map((u) => getProfile(u))),
  ]);
  const profileByUid = new Map(workerProfiles.filter(Boolean).map((p) => [p!.uid, p!]));

  const myInterests = await listMyInterests(uid);
  const appliedAds = await Promise.all(myInterests.map((i) => getJobAd(i.adId)));

  const banner = sp.posted
    ? "Job ad posted — it runs for 30 days."
    : sp.filled
      ? "Marked as filled — congratulations on the hire!"
      : sp.closed
        ? "Ad closed."
        : sp.shortlisted
          ? "Shortlisted — your mobile numbers are now visible to each other."
          : sp.passed
            ? "Marked as passed."
            : sp.withdrawn
              ? "Interest withdrawn."
              : typeof sp.error === "string"
                ? sp.error
                : null;

  return (
    <div className="mx-auto w-full max-w-sm md:max-w-2xl lg:max-w-3xl">
      <BlurFade delay={0}>
        <h1 className="mb-1 text-[24px] font-semibold tracking-tight">My ads &amp; applications</h1>
        <p className="mb-5 text-sm" style={{ color: "var(--c-text-2)" }}>
          Manage job ads you&apos;ve posted and jobs you applied to.
        </p>
      </BlurFade>

      {banner && (
        <BlurFade delay={0.03}>
          <div className="cc-card mb-5 text-xs leading-relaxed" style={{ boxShadow: "0 0 0 1px var(--c-accent), var(--shadow-border)" }}>
            {banner}
          </div>
        </BlurFade>
      )}

      {/* My ads */}
      <BlurFade delay={0.06}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">My job ads</h2>
          <Link href="/trabaho/post" className="text-xs font-semibold" style={{ color: "var(--c-accent)" }}>
            + Post a job
          </Link>
        </div>
      </BlurFade>

      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        {myAds.length === 0 && (
          <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
            No job ads yet — hiring? Posting is free for households and businesses.
          </div>
        )}

        {adsAndInterests.map(({ ad, interests }, idx) => {
          const st = ad.removedByModeration
            ? { bg: "var(--c-danger-light)", fg: "var(--c-danger)", label: "Removed by moderators" }
            : (AD_STYLES[adStatusKey(ad)] ?? AD_STYLES.open);
          const active = interests.filter((i) => i.status === "interested" || i.status === "shortlisted");
          return (
            <BlurFade key={ad.id} delay={0.08 + Math.min(idx, 5) * 0.04}>
              <div className="cc-card">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <Link href={`/trabaho/${ad.id}`} className="min-w-0 flex-1 text-[15px] font-semibold">
                    {ad.title}
                  </Link>
                  <span className="cc-badge" style={{ background: st.bg, color: st.fg }}>
                    {st.label}
                  </span>
                </div>
                <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
                  {getWorkCategory(ad.categorySlug)?.label} ·{" "}
                  {salaryLine(ad) ?? "Salary not shown"} · 📍 {ad.barangay}
                </div>

                {ad.status === "open" && (
                  <div className="mb-3 flex gap-2">
                    <form action={setAdStatusAction}>
                      <input type="hidden" name="adId" value={ad.id} />
                      <input type="hidden" name="status" value="filled" />
                      <button type="submit" className="cc-btn cc-btn-primary" style={{ width: "auto", padding: "0 14px", minHeight: 36, fontSize: 12 }}>
                        Mark filled
                      </button>
                    </form>
                    <form action={setAdStatusAction}>
                      <input type="hidden" name="adId" value={ad.id} />
                      <input type="hidden" name="status" value="closed" />
                      <button type="submit" className="cc-btn cc-btn-ghost" style={{ width: "auto", padding: "0 14px", minHeight: 36, fontSize: 12 }}>
                        Close
                      </button>
                    </form>
                  </div>
                )}

                {active.length === 0 ? (
                  <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
                    No applicants yet — workers browsing Trabaho will see it.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {active.map((interest) => {
                      const t = trust.get(interest.workerUid);
                      const wp = profileByUid.get(interest.workerUid);
                      const tier = t ? trustTier(t.completedCount, t.vouches) : null;
                      const workerVerified = t
                        ? effectiveVerification(t.verificationStatus, t.verifiedUntil) === "verified"
                        : false;
                      return (
                        <div key={interest.id} className="rounded-[12px] p-2.5" style={{ background: "var(--c-surface)", boxShadow: "var(--shadow-border)" }}>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold">{interest.workerName}</span>
                            {tier && (
                              <span className="cc-badge" style={trustBadgeStyle(tier.key)}>
                                {tier.emoji} {tier.label}
                              </span>
                            )}
                            {workerVerified && (
                              <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
                                ✅
                              </span>
                            )}
                          </div>
                          {tier && t && (
                            <div className="mb-1 text-[10.5px]" style={{ color: "var(--c-text-3)" }}>
                              {trustSummaryLine(t.completedCount, t.vouches)}
                            </div>
                          )}
                          {interest.message && (
                            <p className="mb-1.5 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                              “{interest.message}”
                            </p>
                          )}
                          {interest.status === "shortlisted" ? (
                            <div className="text-xs font-semibold cc-num">
                              📞 {interest.workerMobile}
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <form action={decideInterestAction}>
                                <input type="hidden" name="adId" value={ad.id} />
                                <input type="hidden" name="workerUid" value={interest.workerUid} />
                                <input type="hidden" name="decision" value="shortlisted" />
                                <button type="submit" className="cc-btn cc-btn-primary" style={{ width: "auto", padding: "0 14px", minHeight: 34, fontSize: 12 }}>
                                  Shortlist — share numbers
                                </button>
                              </form>
                              <form action={decideInterestAction}>
                                <input type="hidden" name="adId" value={ad.id} />
                                <input type="hidden" name="workerUid" value={interest.workerUid} />
                                <input type="hidden" name="decision" value="passed" />
                                <button type="submit" className="cc-btn cc-btn-ghost" style={{ width: "auto", padding: "0 14px", minHeight: 34, fontSize: 12 }}>
                                  Pass
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </BlurFade>
          );
        })}
      </div>

      {/* My applications */}
      <BlurFade delay={0.1}>
        <h2 className="mb-2 text-sm font-semibold">Jobs I applied to</h2>
      </BlurFade>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {myInterests.length === 0 && (
          <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
            You haven&apos;t applied to any jobs —{" "}
            <Link href="/trabaho" className="font-semibold" style={{ color: "var(--c-accent)" }}>
              browse Trabaho →
            </Link>
          </div>
        )}

        {myInterests.map((interest, idx) => {
          const ad = appliedAds[idx];
          const st = INTEREST_STYLES[interest.status] ?? INTEREST_STYLES.interested;
          return (
            <BlurFade key={interest.id} delay={0.12 + Math.min(idx, 5) * 0.04}>
              <div className="cc-card">
                <div className="mb-1 flex items-start justify-between gap-2">
                  {ad ? (
                    <Link href={`/trabaho/${ad.id}`} className="min-w-0 flex-1 text-[15px] font-semibold">
                      {ad.title}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1 text-[15px] font-semibold" style={{ color: "var(--c-text-2)" }}>
                      (ad removed)
                    </div>
                  )}
                  <span className="cc-badge" style={{ background: st.bg, color: st.fg }}>
                    {st.label}
                  </span>
                </div>
                {ad && (
                  <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
                    {ad.posterType === "business" ? "🏪" : "🏠"} {ad.posterName} · 📍 {ad.barangay}
                  </div>
                )}
                {interest.status === "shortlisted" && (
                  <div className="mb-2 text-xs font-semibold cc-num">
                    📞 {interest.posterMobile}
                  </div>
                )}
                {(interest.status === "interested" || interest.status === "shortlisted") && ad && (
                  <form action={withdrawInterestAction}>
                    <input type="hidden" name="adId" value={ad.id} />
                    <button type="submit" className="cc-btn cc-btn-ghost" style={{ width: "auto", padding: "0 14px", minHeight: 34, fontSize: 12 }}>
                      Withdraw
                    </button>
                  </form>
                )}
              </div>
            </BlurFade>
          );
        })}
      </div>
    </div>
  );
}
