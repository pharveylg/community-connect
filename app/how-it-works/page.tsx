import type { Metadata } from "next";
import Link from "next/link";
import { BlurFade } from "@/components/mp/blur-fade";
import { InstallButton } from "../install-button";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "From posting to payment in three steps — find everyday, cash-on-hand services in your barangay, or offer yours.",
};

const STEPS = [
  {
    n: "01",
    title: "Browse — or post what you need",
    body: "Tricycle rides, tubero, cleaners, caregivers — filtered by barangay. Can't find it? Post the job and let verified providers come to you.",
  },
  {
    n: "02",
    title: "Send a booking request",
    body: "Pick a date, add a note, done. The provider accepts or declines — often within minutes.",
  },
  {
    n: "03",
    title: "Pay them directly",
    body: "Cash, GCash, or Maya — agreed between you two. No marks-ups, no app charges for seekers.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="relative mx-auto w-full max-w-md px-5 pb-12 pt-14 lg:max-w-2xl xl:max-w-6xl">
      <BlurFade delay={0}>
        <Link href="/" className="text-xs font-semibold" style={{ color: "var(--c-accent)" }}>
          ← Community Connect
        </Link>
        <h1 className="mb-2 mt-4 text-[28px] font-semibold tracking-tight">How it works</h1>
        <p className="mb-8 max-w-[46ch] text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          From posting to payment in three steps — no middleman, no mark-ups.
          Seeking is free forever; providers pay nothing to quote.
        </p>
      </BlurFade>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <BlurFade key={step.n} delay={0.08 + i * 0.08}>
            <div className="cc-card flex gap-4">
              <div
                className="cc-num flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-sm font-bold"
                style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}
              >
                {step.n}
              </div>
              <div>
                <div className="mb-1 text-[15px] font-semibold">{step.title}</div>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                  {step.body}
                </p>
              </div>
            </div>
          </BlurFade>
        ))}
      </div>

      <BlurFade delay={0.35}>
        <div className="mt-10">
          <InstallButton />
        </div>
      </BlurFade>

      <BlurFade delay={0.4}>
        <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
          Community Connect is a listing &amp; connectivity service. Payments are made directly
          between you and your provider (cash, GCash, Maya) — we never hold your money.
        </p>
        <p className="mt-4 text-center">
          <Link href="/register" className="text-xs font-semibold" style={{ color: "var(--c-accent)" }}>
            Create a free account →
          </Link>
        </p>
      </BlurFade>
    </div>
  );
}
