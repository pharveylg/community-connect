import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { BlurFade } from "@/components/mp/blur-fade";
import { getSessionUid } from "@/lib/dal";
import { getProfile } from "@/lib/firestore";
import { roleHomePath, safeNextPath } from "@/lib/roles";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  // Only a VALID session is redirected home; a stale cookie must be able
  // to see and use the login form (it gets replaced on sign-in).
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
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight">Welcome back</h1>
          <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
            Sign in to your account
          </p>
        </BlurFade>

        <BlurFade delay={0.08}>
          <LoginForm next={next} />
        </BlurFade>

        <BlurFade delay={0.16}>
          <p className="mt-5 text-center text-sm" style={{ color: "var(--c-text-2)" }}>
            Don&apos;t have an account?{" "}
            <Link
            href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold"
            style={{ color: "var(--c-accent)" }}
          >
              Sign up
            </Link>
          </p>
        </BlurFade>
      </div>
    </div>
  );
}
