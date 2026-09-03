import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { getJobPost, listMyOffers, listOpenJobPosts, type JobPost } from "@/lib/jobboard";
import { effectiveVerification } from "@/lib/verifications";
import { allowanceFor } from "@/lib/wallet";
import { EXTRA_ACCEPT_FEE_PESOS, SERVICE_CATEGORIES, getCategory } from "@/lib/catalog";
import { BlurFade } from "@/components/mp/blur-fade";
import { BackLink } from "@/components/back-link";
import { ReportContent } from "@/components/report-content";
import { OfferForm } from "./offer-form";

const OFFER_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: "#fdf3dc", fg: "#8a5a00", label: "Offer sent" },
  selected: { bg: "var(--c-accent-light)", fg: "var(--c-accent)", label: "Chosen — confirm from Bookings" },
  accepted: { bg: "var(--c-success-light)", fg: "var(--c-success)", label: "Won ✓" },
  declined: { bg: "var(--c-danger-light)", fg: "var(--c-danger)", label: "Not chosen" },
  withdrawn: { bg: "var(--c-surface-2)", fg: "var(--c-text-2)", label: "Withdrawn" },
};

export default async function JobBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const rawCategory = typeof params.category === "string" ? params.category : undefined;
  const category = rawCategory ? getCategory(rawCategory) : undefined;

  const banner = typeof params.offered === "string"
    ? "Offer sent — if the seeker picks you, confirm it from Booking requests to lock the job."
    : typeof params.withdrawn === "string"
      ? "Offer withdrawn."
      : typeof params.error === "string"
        ? params.error
        : null;

  const [posts, myOffers] = await Promise.all([
    listOpenJobPosts(category?.slug),
    listMyOffers(profile.uid),
  ]);
  const offeredPostIds = new Set(
    myOffers.filter((o) => o.status === "pending" || o.status === "selected").map((o) => o.postId)
  );
  const postTitles = new Map<string, string>();
  for (const pid of [...new Set(myOffers.map((o) => o.postId))].slice(0, 12)) {
    const post = await getJobPost(pid);
    if (post) postTitles.set(pid, post.title);
  }

  const verification = effectiveVerification(profile.verificationStatus, profile.verifiedUntil);
  const verified = verification === "verified";
  const allowance = allowanceFor(profile);
  const canOffer = verified && (allowance.freeRemaining > 0 || profile.credits >= EXTRA_ACCEPT_FEE_PESOS);

  return (
    <div className="mx-auto w-full max-w-sm md:max-w-2xl lg:max-w-5xl xl:max-w-7xl">
      <BackLink href="/provider" label="Home" />
      <BlurFade delay={0}>
        <h1 className="mb-1 text-[24px] font-semibold tracking-tight">Open jobs near you</h1>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Seekers posting what they need — make an offer with your price. If they
          pick you, confirm it like any booking.
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

      {!verified && (
        <BlurFade delay={0.06}>
          <div className="cc-card mb-5">
            <div className="mb-1.5 text-sm font-semibold">✅ Verification required to offer</div>
            <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              Job posts often come from people who need help at home — so only
              ID-verified providers can make offers. Verification is free and
              takes 1–2 days.
            </p>
            <Link
              href="/provider/verification"
              className="cc-btn cc-btn-primary"
              style={{ width: "auto", minHeight: 38, fontSize: 13, padding: "0 16px" }}
            >
              {verification === "pending" ? "View verification status" : "Get verified"}
            </Link>
          </div>
        </BlurFade>
      )}

      <BlurFade delay={0.08}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Link href="/provider/jobs" className={`cc-chip ${!category ? "cc-chip-active" : ""}`}>
            All
          </Link>
          {SERVICE_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/provider/jobs?category=${cat.slug}`}
              className={`cc-chip ${category?.slug === cat.slug ? "cc-chip-active" : ""}`}
            >
              <span className="text-sm leading-none">{cat.emoji}</span> {cat.label}
            </Link>
          ))}
        </div>
      </BlurFade>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0 && (
          <BlurFade delay={0.1}>
            <div className="cc-card text-center">
              <div className="mb-1.5 text-sm font-medium">
                {category ? `No open ${category.label.toLowerCase()} requests` : "No open requests right now"}
              </div>
              <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                New posts appear here — check back, or make sure your services are
                listed so seekers can find you in browse.
              </div>
            </div>
          </BlurFade>
        )}

        {posts.map((post, i) => (
          <BlurFade key={post.id} delay={0.1 + i * 0.05}>
            <JobPostCard
              post={post}
              alreadyOffered={offeredPostIds.has(post.id)}
              canOffer={canOffer}
              verified={verified}
            />
          </BlurFade>
        ))}
      </div>

      {myOffers.length > 0 && (
        <div className="mt-6">
          <BlurFade delay={0.1}>
            <h2 className="mb-2.5 text-sm font-semibold">My offers</h2>
          </BlurFade>
          <div className="flex flex-col gap-2.5">
            {myOffers.slice(0, 8).map((offer, i) => {
              const st = OFFER_STATUS[offer.status] ?? OFFER_STATUS.pending;
              return (
                <BlurFade key={offer.id} delay={0.12 + i * 0.05}>
                  <div className="cc-card flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">
                        {postTitles.get(offer.postId) ?? "Request"}
                      </div>
                      <div className="text-xs cc-num" style={{ color: "var(--c-text-2)" }}>
                        Your price: ₱{offer.amount.toLocaleString("en-PH")}
                      </div>
                    </div>
                    <span className="cc-badge" style={{ background: st.bg, color: st.fg }}>
                      {st.label}
                    </span>
                  </div>
                </BlurFade>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function JobPostCard({
  post,
  alreadyOffered,
  canOffer,
  verified,
}: {
  post: JobPost;
  alreadyOffered: boolean;
  canOffer: boolean;
  verified: boolean;
}) {
  return (
    <div className="cc-card">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-[15px] font-semibold">{post.title}</div>
        {post.needsPro && (
          <span
            className="cc-badge"
            style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}
          >
            🛠 Pro requested
          </span>
        )}
      </div>
      <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
        From {post.seekerName.split(" ")[0]} · 📍 {post.barangay}, {post.city} ·{" "}
        {post.whenNeeded === "flexible" ? "Flexible" : post.whenNeeded}
        {post.bookingFor === "dependent" ? " · booking for a family member" : ""}
      </div>
      {post.description && (
        <p className="mb-2.5 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          {post.description}
        </p>
      )}
      <div className="mb-3 text-sm font-semibold cc-num">
        {post.budget ? `Budget ₱${post.budget.toLocaleString("en-PH")}` : "Open to quotes"}
        {post.custom && (
          <span className="cc-badge ml-2" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
            ✨ unlisted service
          </span>
        )}
      </div>

      <ReportContent targetType="job_post" targetId={post.id} back="/provider/jobs" label="Report post" />
      {alreadyOffered ? (
        <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
          You already made an offer on this — see My offers below.
        </div>
      ) : canOffer ? (
        <OfferForm postId={post.id} />
      ) : verified ? (
        <div className="text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
          You need a free accept or ₱{EXTRA_ACCEPT_FEE_PESOS} credits to make offers — top up first.
        </div>
      ) : null}
    </div>
  );
}
