import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getProfile } from "@/lib/firestore";
import { verifySession } from "@/lib/dal";
import { roleHomePath, safeNextPath } from "@/lib/roles";
import { CompleteProfileFlow } from "./complete-profile-flow";
import { BlurFade } from "@/components/mp/blur-fade";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const { uid } = await verifySession();
  const profile = await getProfile(uid);

  if (profile?.role) {
    // Already fully onboarded — honor ?next= (e.g. back to a booking).
    redirect(next ?? roleHomePath(profile.role));
  }

  const email = profile?.email || (await getAdminAuth().getUser(uid)).email || "";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <BlurFade delay={0}>
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight">
            Finish setting up your account
          </h1>
          <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
            {profile
              ? "A couple of quick questions and you're in."
              : "Your account was created but not completed — let's pick up where you left off."}
          </p>
        </BlurFade>
        <BlurFade delay={0.08}>
          <CompleteProfileFlow email={email} hasProfile={Boolean(profile)} next={next} />
        </BlurFade>
      </div>
    </div>
  );
}
