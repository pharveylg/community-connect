import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { listMyJobPosts, listPostOffers, JOB_BOARD_POST_TTL_DAYS, type JobPost } from "@/lib/jobboard";
import { getProviderTrust } from "@/lib/firestore";
import { trustBadgeStyle, trustTier, trustSummaryLine } from "@/lib/trust";
import { effectiveVerification } from "@/lib/verifications";
import { acceptOfferAction, closeJobPostAction } from "@/app/actions/jobboard";
import { BlurFade } from "@/components/mp/blur-fade";

const STATUS_STYLES: Record<JobPost["status"], { bg: string; fg: string; label: string }> = {
  open: { bg: "var(--c-success-light)", fg: "var(--c-success)", label: "Open" },
  matched: { bg: "#fdf3dc", fg: "#8a5a00", label: "Waiting for provider to confirm" },
  filled: { bg: "var(--c-accent-light)", fg: "var(--c-accent)", label: "Filled ✓" },
  closed: { bg: "var(--c-surface-2)", fg: "var(--c-text-2)", label: "Closed" },
};

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const banner = typeof params.posted === "string"
    ? "Request posted — verified providers near you can now make offers."
    : typeof params.matched === "string"
      ? "Offer accepted — waiting for the provider to confirm. You'll see the job in My bookings once confirmed."
      : typeof params.closed === "string"
        ? "Request closed."
        : typeof params.error === "string"
          ? params.error
          : null;

  const posts = await listMyJobPosts(profile.uid);
  const postsWithOffers = await Promise.all(
    posts.map(async (post) => ({
      post,
      offers: post.status === "open" || post.status === "matched"
        ? await listPostOffers(post.id)
        : [],
    }))
  );
  const providerUids = postsWithOffers.flatMap((p) =>
    p.offers.map((o) => o.providerUid)
  );
  const trust = await getProviderTrust(providerUids);

  return (
    <div className="mx-auto w-full max-w-sm">
      <BlurFade delay={0}>
        <h1 className="mb-1 text-[24px] font-semibold tracking-tight">My requests</h1>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Post what you need — even services no one lists yet. Only ✅ ID-verified
          providers can make offers.
        </p>
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

      <BlurFade delay={0.06}>
        <Link href="/seeker/requests/new" className="cc-btn cc-btn-primary">
          🎯 Post a request
        </Link>
      </BlurFade>

      <div className="mt-5 flex flex-col gap-4">
        {posts.length === 0 && (
          <BlurFade delay={0.08}>
            <div className="cc-card text-center">
              <div className="mb-2 text-sm font-medium">No requests yet</div>
              <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                Can&apos;t find what you need in browse? Post it — e.g. aircon cleaning,
                junk hauling, lining up at an office. Offers stay open for{" "}
                {JOB_BOARD_POST_TTL_DAYS} days.
              </p>
            </div>
          </BlurFade>
        )}

        {postsWithOffers.map(({ post, offers }, i) => {
          const st = STATUS_STYLES[post.status];
          const pendingOffers = offers.filter((o) => o.status === "pending");
          return (
            <BlurFade key={post.id} delay={0.08 + i * 0.06}>
              <div className="cc-card">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="text-[15px] font-semibold">{post.title}</div>
                  <span className="cc-badge" style={{ background: st.bg, color: st.fg }}>
                    {st.label}
                  </span>
                </div>
                <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
                  📍 {post.barangay}, {post.city} ·{" "}
                  {post.whenNeeded === "flexible" ? "Flexible" : post.whenNeeded} ·{" "}
                  {post.budget ? `Budget ₱${post.budget.toLocaleString("en-PH")}` : "Open to quotes"}
                </div>
                {post.description && (
                  <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                    {post.description}
                  </p>
                )}

                {post.status === "open" && pendingOffers.length === 0 && (
                  <div className="mb-2 text-xs" style={{ color: "var(--c-text-3)" }}>
                    No offers yet — providers near you will see it on their job board.
                  </div>
                )}

                {pendingOffers.length > 0 && (
                  <div className="mb-3 flex flex-col gap-2.5">
                    {pendingOffers.map((offer) => {
                      const t = trust.get(offer.providerUid);
                      const tier = t ? trustTier(t.completedCount, t.vouches) : null;
                      const verified = t
                        ? effectiveVerification(t.verificationStatus, t.verifiedUntil) === "verified"
                        : false;
                      return (
                        <div
                          key={offer.id}
                          className="rounded-[12px] p-3"
                          style={{ background: "var(--c-surface-2)" }}
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-[13px] font-semibold">{offer.providerName}</span>
                            {verified && (
                              <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
                                ✅
                              </span>
                            )}
                            {tier && (
                              <span className="cc-badge" style={trustBadgeStyle(tier.key)}>
                                {tier.emoji} {tier.label}
                              </span>
                            )}
                            <span className="ml-auto text-[13px] font-semibold cc-num">
                              ₱{offer.amount.toLocaleString("en-PH")}
                            </span>
                          </div>
                          {tier && t && (
                            <div className="mb-1 text-[10.5px]" style={{ color: "var(--c-text-3)" }}>
                              {trustSummaryLine(t.completedCount, t.vouches)}
                            </div>
                          )}
                          {offer.message && (
                            <p className="mb-2 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                              “{offer.message}”
                            </p>
                          )}
                          <form action={acceptOfferAction}>
                            <input type="hidden" name="postId" value={post.id} />
                            <input type="hidden" name="providerUid" value={offer.providerUid} />
                            <button
                              type="submit"
                              className="cc-btn cc-btn-primary"
                              style={{ width: "auto", minHeight: 36, fontSize: 12.5, padding: "0 14px" }}
                            >
                              Accept {offer.providerName.split(" ")[0]}&apos;s offer
                            </button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                )}

                {post.status === "open" && (
                  <form action={closeJobPostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button
                      type="submit"
                      className="cc-btn cc-btn-ghost"
                      style={{ width: "auto", minHeight: 36, fontSize: 12.5, padding: "0 12px" }}
                    >
                      Close this request
                    </button>
                  </form>
                )}
              </div>
            </BlurFade>
          );
        })}
      </div>

      <BlurFade delay={0.12}>
        <Link
          href="/seeker"
          className="cc-btn cc-btn-ghost mt-4"
          style={{ width: "auto", padding: "0 16px" }}
        >
          ← Back to browse
        </Link>
      </BlurFade>
    </div>
  );
}
