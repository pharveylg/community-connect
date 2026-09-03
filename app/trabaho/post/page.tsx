import Link from "next/link";
import { getSessionUid } from "@/lib/dal";
import { getProfile } from "@/lib/firestore";
import { effectiveVerification } from "@/lib/verifications";
import { BlurFade } from "@/components/mp/blur-fade";
import { PostJobAdForm } from "./post-job-ad-form";

const VERIFICATION_COPY: Record<string, { title: string; body: string }> = {
  pending: { title: "⏳ Verification under review", body: "We're reviewing your ID — usually 1–2 days. You can post your job ad as soon as you're verified." },
  rejected: { title: "Verification was rejected", body: "You can resubmit after the cooldown (7 days). See the reason on the verification page." },
  expired: { title: "Verification expired", body: "Your yearly verification lapsed — submit a fresh one to post job ads." },
  unverified: { title: "ID verification needed", body: "Only ID-verified accounts can post job ads — it keeps fake vacancies and scams out. It's free and takes about a day." },
};

export default async function PostJobAdPage() {
  const uid = await getSessionUid();

  if (!uid) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <BlurFade delay={0}>
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight">Post a job</h1>
          <div className="cc-card">
            <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              Create a free account (or log in) to post a job ad. Posting needs
              ID verification — free, reviewed in about a day.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/register?next=%2Ftrabaho%2Fpost" className="cc-btn cc-btn-primary">
                Sign up — it&apos;s free
              </Link>
              <Link href="/login?next=%2Ftrabaho%2Fpost" className="cc-btn cc-btn-secondary">
                I already have an account
              </Link>
            </div>
          </div>
        </BlurFade>
      </div>
    );
  }

  const profile = await getProfile(uid);
  if (!profile?.role) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <div className="cc-card">
          <div className="mb-2 text-sm font-semibold">Almost there</div>
          <p className="mb-3 text-xs" style={{ color: "var(--c-text-2)" }}>
            Finish setting up your account first, then come back to post.
          </p>
          <Link href="/onboarding?next=%2Ftrabaho%2Fpost" className="cc-btn cc-btn-primary">
            Finish setup
          </Link>
        </div>
      </div>
    );
  }

  const status = effectiveVerification(profile.verificationStatus, profile.verifiedUntil);

  if (status !== "verified") {
    const copy = VERIFICATION_COPY[status] ?? VERIFICATION_COPY.unverified;
    return (
      <div className="mx-auto w-full max-w-sm">
        <BlurFade delay={0}>
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight">Post a job</h1>
          <p className="mb-5 text-sm" style={{ color: "var(--c-text-2)" }}>
            Free job ads for households and small businesses.
          </p>
        </BlurFade>
        <BlurFade delay={0.06}>
          <div className="cc-card">
            <div className="mb-1.5 text-sm font-semibold">{copy.title}</div>
            <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              {copy.body}
            </p>
            <Link href="/verification?next=%2Ftrabaho%2Fpost" className="cc-btn cc-btn-primary">
              {status === "pending" ? "View status" : "Get ID-verified — free"}
            </Link>
          </div>
        </BlurFade>
      </div>
    );
  }

  return (
    <PostJobAdForm
      defaultBarangay=""
      defaultCity="Cagayan de Oro City"
      posterName={profile.fullName}
    />
  );
}
