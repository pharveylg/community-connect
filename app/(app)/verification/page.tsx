import { getCurrentProfile } from "@/lib/dal";
import { listMyVerifications } from "@/lib/verifications";
import { effectiveVerification } from "@/lib/verifications";
import { VERIFICATION_ID_LABELS, type VerificationIdType } from "@/lib/catalog";
import { BlurFade } from "@/components/mp/blur-fade";
import { BackLink } from "@/components/back-link";
import { VerificationForm } from "./verification-form";

function formatDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "";
}

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getCurrentProfile();
  const requests = await listMyVerifications(profile.uid);
  const latest = requests[0];
  const status = effectiveVerification(profile.verificationStatus, profile.verifiedUntil);
  const submitted = typeof (await searchParams).submitted === "string";

  return (
    <div className="mx-auto w-full max-w-sm md:max-w-md lg:max-w-lg">
      <BackLink href="/" label="Home" />
      <BlurFade delay={0}>
        <h1 className="mb-1 text-[24px] font-semibold tracking-tight">ID verification</h1>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Optional, free, reviewed by our team in 1–2 days. A ✅ badge helps others
          trust you faster — as a provider it wins clients, and it&apos;s required to
          post 💼 Trabaho job ads.
        </p>
      </BlurFade>

      {submitted && (
        <BlurFade delay={0.04}>
          <div
            className="cc-card mb-5 text-xs leading-relaxed"
            style={{ boxShadow: "0 0 0 1px var(--c-accent), var(--shadow-border)" }}
          >
            Submitted — we&apos;ll review it within 1–2 days. Your photos are deleted
            after review.
          </div>
        </BlurFade>
      )}

      {(status === "pending" || (latest && latest.status === "pending")) && (
        <BlurFade delay={0.08}>
          <div className="cc-card mb-5">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="cc-badge" style={{ background: "#fdf3dc", color: "#8a5a00" }}>
                ⏳ Under review
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              {latest ? `Submitted ${formatDate(latest.submittedAt)} · ` : ""}
              {latest ? VERIFICATION_ID_LABELS[latest.idType as VerificationIdType] : ""}
              {latest?.idNumberLast4 ? ` (•••• ${latest.idNumberLast4})` : ""}. We&apos;ll
              also text you when the review is done (SMS coming soon).
            </p>
          </div>
        </BlurFade>
      )}

      {status === "verified" && (
        <BlurFade delay={0.08}>
          <div className="cc-card mb-5 text-center">
            <div className="mb-2 text-3xl">✅</div>
            <div className="mb-1 text-sm font-semibold">ID Verified</div>
            <p className="text-xs" style={{ color: "var(--c-text-2)" }}>
              Verified since {formatDate(profile.verifiedAt)} · renews by{" "}
              {formatDate(profile.verifiedUntil)}
            </p>
          </div>
        </BlurFade>
      )}

      {status === "expired" && (
        <BlurFade delay={0.08}>
          <div className="cc-card mb-5">
            <div className="mb-1 text-sm font-semibold">Verification expired</div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              Your yearly verification lapsed on {formatDate(profile.verifiedUntil)} —
              submit a fresh one below to keep the badge.
            </p>
          </div>
        </BlurFade>
      )}

      {latest && latest.status === "rejected" && (
        <BlurFade delay={0.1}>
          <div className="cc-card mb-5">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="cc-badge" style={{ background: "var(--c-danger-light)", color: "var(--c-danger)" }}>
                Rejected
              </span>
              <span className="text-xs" style={{ color: "var(--c-text-3)" }}>
                {formatDate(latest.decidedAt)}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              Reason: {latest.rejectionReason ?? "—"}. You can update your details
              and resubmit (7-day cooldown applies).
            </p>
          </div>
        </BlurFade>
      )}

      {(status === "unverified" || status === "rejected" || status === "expired") && (
        <BlurFade delay={0.12}>
          <VerificationForm profileMobile={profile.mobile} />
        </BlurFade>
      )}

      <BlurFade delay={0.16}>
        <p className="mt-5 text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
          Your documents are used only for this review, are visible only to the
          review team, and are deleted once a decision is made. They are never
          shown to other users.
        </p>
      </BlurFade>
    </div>
  );
}
