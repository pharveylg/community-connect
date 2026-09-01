import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">Welcome back</h1>
        <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
          Sign in to your account
        </p>

        <LoginForm />

        <p className="mt-4 text-center text-sm" style={{ color: "var(--c-text-2)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium" style={{ color: "var(--c-accent)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
