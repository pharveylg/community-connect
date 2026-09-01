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

      <div className="cc-card mb-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: "var(--c-text-2)" }}>Balance</div>
            <div className="text-2xl font-semibold">{formatPeso(profile.credits)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: "var(--c-text-2)" }}>Free accepts</div>
            <div className="text-2xl font-semibold">
              {allowance.freeRemaining}
              <span className="text-sm font-normal" style={{ color: "var(--c-text-3)" }}>
                {" "}/ {FREE_MONTHLY_ACCEPTS}
              </span>
            </div>
          </div>
        </div>
        <div className="text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
          Extra accepts cost {formatPeso(EXTRA_ACCEPT_FEE_PESOS)} each, deducted
          from your balance. Credits are non-refundable and can only be used for
          platform fees.
        </div>
      </div>

      <TopUpForm />

      {topups.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold">My top-up requests</h2>
          <div className="flex flex-col gap-2">
            {topups.map((t) => {
              const st = TOPUP_STATUS_STYLES[t.status] ?? TOPUP_STATUS_STYLES.pending;
              return (
                <div key={t.id} className="cc-card flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{formatPeso(t.amount)}</div>
                    <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                      {TOPUP_METHOD_LABELS[t.method as TopUpMethod] ?? t.method} · ref {t.refNumber}
                      {t.note ? ` · ${t.note}` : ""}
                    </div>
                  </div>
                  <span className="cc-badge" style={{ background: st.bg, color: st.fg }}>
                    {t.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5">
        <h2 className="mb-2 text-sm font-semibold">Credit history</h2>
        <div className="flex flex-col gap-2">
          {events.length === 0 && (
            <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
              Nothing yet — accepts and top-ups will appear here.
            </div>
          )}
          {events.map((e) => (
            <div key={e.id} className="cc-card flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
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
                  className="text-sm font-semibold"
                  style={{ color: e.amount > 0 ? "#1e6b2e" : e.amount < 0 ? "var(--c-danger)" : "var(--c-text-2)" }}
                >
                  {e.amount > 0 ? "+" : ""}
                  {e.amount === 0 ? "₱0" : formatPeso(e.amount)}
                </div>
                <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
                  bal {formatPeso(e.balanceAfter)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
