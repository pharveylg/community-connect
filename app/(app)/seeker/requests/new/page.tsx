import { getCurrentProfile } from "@/lib/dal";
import { BlurFade } from "@/components/mp/blur-fade";
import { BackLink } from "@/components/back-link";
import { NewJobPostForm } from "./new-job-post-form";

export default async function NewJobPostPage() {
  const profile = await getCurrentProfile();
  return (
    <div className="mx-auto w-full max-w-sm md:max-w-md">
      <BackLink href="/seeker/requests" label="My requests" />
      <BlurFade delay={0}>
        <h1 className="mb-1 text-[24px] font-semibold tracking-tight">What do you need?</h1>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Describe the job — even if no one lists it. Verified providers near you
          will send offers with their prices.
        </p>
      </BlurFade>
      <BlurFade delay={0.08}>
        <NewJobPostForm defaultCity="Cagayan de Oro City" seekerName={profile.fullName} />
      </BlurFade>
    </div>
  );
}
