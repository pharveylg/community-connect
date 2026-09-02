import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { allowanceFor, listMyTopUpRequests, listWalletEvents } from "@/lib/wallet";
import {
  EXTRA_ACCEPT_FEE_PESOS,
  FREE_MONTHLY_ACCEPTS,
  TOPUP_METHOD_LABELS,
  formatPeso,
  type TopUpMethod,
} from "@/lib/catalog";
import { BlurFade } from "@/components/mp/blur-fade";
import { AnimatedNumber } from "@/components/mp/animated-number";
import { TopUpForm } from "./topup-form";

const TOPUP_STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#fff4e0", fg: "#8a5a00" },
  approved: { bg: "#e7f4e9", fg: "#1e6b2e" },
  rejected: { bg: "var(--c-danger-light)", fg: "var(--c-danger)" },
};

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getCurrentProfile();
  if (profile.role !== "provider") redirect("/");

  const params = await searchParams;
  const banner = typeof params.requested === "string"
    ? "Top-up request submitted — an admin will confirm it shortly."
    : null;

  const [events, topups, allowance] = await Promise.all([
    listWalletEvents(profile.uid, 15),
    listMyTopUpRequests(profile.uid, 10),
    Promise.resolve(allowanceFor(profile)),
  ]);

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-1 text-xl font-semibold">Credits</h1>
      <p className="mb-5 text-sm" style={{ color: "var(--c-text-2)" }}>
        Credits pay for accepts beyond your {FREE_MONTHLY_ACCEPTS} free each month.
      </p>

      {banner && (
        <div className="cc-card mb-4 text-xs leading-relaxed" style={{ borderColor: "var(--c-accent)" }}>
          {banner}
        </div>
      )}

      <BlurFade delay={0.05}>
        <div
          className="cc-card mb-5"
          style={{
            background: "linear-gradient(135deg,#0b4480 0%,#0e7a5f 130%)",
            color: "#fff",
            boxShadow: "var(--shadow-btn)",
          }}
        >
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.12em] opacity-75">
                Balance
              </div>
              <div className="text-[32px] font-semibold leading-none tracking-tight">
                <AnimatedNumber value={profile.credits} prefix="₱" />
              </div>
            </div>
            <div className="text-right">
              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.12em] opacity-75">
                Free accepts
              </div>
              <div className="text-[32px] font-semibold leading-none tracking-tight cc-num">
                {allowance.freeRemaining}
                <span className="text-base font-normal opacity-70"> / {FREE_MONTHLY_ACCEPTS}</span>
              </div>
            </div>
          </div>
          <p className="text-xs leading-relaxed opacity-80">
            Extra accepts cost {formatPeso(EXTRA_ACCEPT_FEE_PESOS)} each, deducted
            from your balance. Credits are non-refundable and can only be used for
            platform fees.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <TopUpForm />
      </BlurFade>

      {topups.length > 0 && (
        <div className="mt-5">
          <BlurFade delay={0.12}>
            <h2 className="mb-2.5 text-sm font-semibold">My top-up requests</h2>
          </BlurFade>
          <div className="flex flex-col gap-2.5">
            {topups.map((t, i) => {
              const st = TOPUP_STATUS_STYLES[t.status] ?? TOPUP_STATUS_STYLES.pending;
              return (
                <BlurFade key={t.id} delay={0.14 + i * 0.06}>
                  <div className="cc-card flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold cc-num">{formatPeso(t.amount)}</div>
                      <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                        {TOPUP_METHOD_LABELS[t.method as TopUpMethod] ?? t.method} · ref {t.refNumber}
                        {t.note ? ` · ${t.note}` : ""}
                      </div>
                    </div>
                    <span className="cc-badge" style={{ background: st.bg, color: st.fg }}>
                      {t.status}
                    </span>
                  </div>
                </BlurFade>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5">
        <BlurFade delay={0.12}>
          <h2 className="mb-2.5 text-sm font-semibold">Credit history</h2>
        </BlurFade>
        <div className="flex flex-col gap-2.5">
          {events.length === 0 && (
            <BlurFade delay={0.14}>
              <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
                Nothing yet — accepts and top-ups will appear here.
              </div>
            </BlurFade>
          )}
          {events.map((e, i) => (
            <BlurFade key={e.id} delay={0.14 + i * 0.05}>
              <div className="cc-card flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {e.type === "topup"
                      ? "Top-up"
                      : e.type === "free_accept"
                        ? "Free accept"
                        : "Accept fee"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--c-text-2)" }}>{e.note}</div>
                </div>
                <div className="text-right">
                  <div
                    className="text-sm font-semibold cc-num"
                    style={{ color: e.amount > 0 ? "var(--c-success)" : e.amount < 0 ? "var(--c-danger)" : "var(--c-text-2)" }}
                  >
                    {e.amount > 0 ? "+" : ""}
                    {e.amount === 0 ? "₱0" : formatPeso(e.amount)}
                  </div>
                  <div className="text-xs cc-num" style={{ color: "var(--c-text-3)" }}>
                    bal {formatPeso(e.balanceAfter)}
                  </div>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </div>
  );
}
