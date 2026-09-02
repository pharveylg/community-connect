import Link from "next/link";
import { LoginForm } from "./login-form";
import { BlurFade } from "@/components/mp/blur-fade";

export default function LoginPage() {
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
          <LoginForm />
        </BlurFade>

        <BlurFade delay={0.16}>
          <p className="mt-5 text-center text-sm" style={{ color: "var(--c-text-2)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold" style={{ color: "var(--c-accent)" }}>
              Sign up
            </Link>
          </p>
        </BlurFade>
      </div>
    </div>
  );
}
