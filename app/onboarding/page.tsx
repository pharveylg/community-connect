import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getProfile } from "@/lib/firestore";
import { verifySession } from "@/lib/dal";
import { roleHomePath } from "@/lib/roles";
import { CompleteProfileFlow } from "./complete-profile-flow";

export default async function OnboardingPage() {
  const { uid } = await verifySession();
  const profile = await getProfile(uid);

  if (profile?.role) {
    // Already fully onboarded — nothing to complete.
    redirect(roleHomePath(profile.role));
  }

  const email = profile?.email || (await getAdminAuth().getUser(uid)).email || "";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">Finish setting up your account</h1>
        <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
          {profile
            ? "A couple of quick questions and you're in."
            : "Your account was created but not completed — let's pick up where you left off."}
        </p>
        <CompleteProfileFlow
          email={email}
          hasProfile={Boolean(profile)}
        />
      </div>
    </div>
  );
}
