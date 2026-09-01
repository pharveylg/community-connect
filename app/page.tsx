import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const FEATURES = [
  ["🚗", "Transport"],
  ["🌿", "Landscaping"],
  ["🔧", "Handyman"],
  ["🎉", "Events"],
  ["🏠", "Care & home"],
  ["📦", "Rentals"],
];

export default async function Home() {
  if ((await cookies()).has("session")) {
    redirect("/seeker");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto mb-4 flex h-18 w-18 items-center justify-center rounded-2xl text-3xl"
          style={{ background: "var(--c-accent)", boxShadow: "0 4px 16px rgba(11,68,128,.3)" }}
        >
          🤝
        </div>
        <h1 className="mb-1.5 text-2xl font-semibold tracking-tight">Community Connect</h1>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Services for everyone — from daily errands to professional help, connecting
          seniors and families with trusted providers.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-2">
          {FEATURES.map(([icon, label]) => (
            <div key={label} className="cc-card text-center">
              <div className="mb-1 text-xl">{icon}</div>
              <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <Link href="/register" className="cc-btn cc-btn-primary">
            Create an account
          </Link>
          <Link href="/login" className="cc-btn cc-btn-secondary">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
