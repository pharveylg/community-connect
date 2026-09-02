import { redirect } from "next/navigation";
import { RegisterFlow } from "./register-flow";
import { BlurFade } from "@/components/mp/blur-fade";
import { getSessionUid } from "@/lib/dal";
import { getProfile } from "@/lib/firestore";
import { roleHomePath } from "@/lib/roles";

export default async function RegisterPage() {
  const uid = await getSessionUid();
  if (uid) {
    const profile = await getProfile(uid);
    if (profile?.role) redirect(roleHomePath(profile.role));
    redirect("/onboarding");
  }
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <BlurFade delay={0}>
          <RegisterFlow />
        </BlurFade>
      </div>
    </div>
  );
}
