import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/firestore";
import { verifySession } from "@/lib/dal";
import { roleHomePath } from "@/lib/roles";
import { SERVICE_CATEGORIES } from "@/lib/catalog";
import { BlurFade } from "@/components/mp/blur-fade";
import { DotPattern } from "@/components/mp/dot-pattern";
import { Marquee } from "@/components/mp/marquee";
import { InstallButton } from "./install-button";

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

export default async function Home() {
  if ((await cookies()).has("session")) {
    const { uid } = await verifySession();
    const profile = await getProfile(uid);
    if (!profile) redirect("/onboarding");
    if (!profile.role) redirect("/onboarding?step=role");
    redirect(roleHomePath(profile.role));
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <DotPattern className="text-[var(--c-text-3)] opacity-[0.16]" />

      {/* soft gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(11,68,128,.16), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(14,122,95,.14), transparent 70%)" }}
      />

      <div className="relative mx-auto w-full max-w-md px-5 pt-16">
        {/* Hero */}
        <BlurFade delay={0} duration={0.5}>
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] text-3xl"
            style={{ background: "linear-gradient(135deg,#0b4480,#0e7a5f)", boxShadow: "var(--shadow-btn)" }}
          >
            🤝
          </div>
        </BlurFade>

        <BlurFade delay={0.08}>
          <h1 className="mb-3 text-[34px] leading-[1.12] font-semibold tracking-tight">
            Your <span className="cc-gradient-text">barangay</span>,
            <br />
            one tap away.
          </h1>
        </BlurFade>

        <BlurFade delay={0.16}>
          <p className="mb-7 max-w-[38ch] text-[15px] leading-relaxed" style={{ color: "var(--c-text-2)" }}>
            Community Connect pairs seekers — including seniors and the family
            who care for them — with trusted nearby providers for everyday,
            cash-on-hand services.
          </p>
        </BlurFade>

        <BlurFade delay={0.24}>
          <div className="mb-12 flex flex-col gap-2.5">
            <Link href="/register" className="cc-btn cc-btn-primary">
              Create an account
            </Link>
            <Link href="/login" className="cc-btn cc-btn-secondary">
              Log in
            </Link>
          </div>
        </BlurFade>

        <BlurFade delay={0.34} inView>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--c-text-3)" }}>
            Every service you can think of
          </h2>
        </BlurFade>
      </div>

      {/* Category marquee */}
      <BlurFade delay={0.4} inView className="relative">
        <Marquee className="py-1">
          {SERVICE_CATEGORIES.map((cat) => (
            <span key={cat.slug} className="cc-chip">
              <span className="text-base leading-none">{cat.emoji}</span> {cat.label}
            </span>
          ))}
        </Marquee>
      </BlurFade>

      <div className="relative mx-auto w-full max-w-md px-5 pb-10">
        {/* How it works */}
        <BlurFade delay={0.1} inView>
          <h2 className="mt-12 mb-5 text-[22px] font-semibold tracking-tight">How it works</h2>
        </BlurFade>
        <div className="mb-12 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <BlurFade key={step.n} delay={0.14 + i * 0.1} inView>
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

        <BlurFade delay={0.2} inView>
          <InstallButton />
        </BlurFade>

        <BlurFade delay={0.26} inView>
          <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
            Community Connect is a listing &amp; connectivity service. Payments
            are made directly between you and your provider (cash, GCash, Maya) —
            we never hold your money.
          </p>
        </BlurFade>
      </div>
    </div>
  );
}
