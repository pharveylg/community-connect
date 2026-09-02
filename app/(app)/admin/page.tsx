import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { browseServices, listProfiles } from "@/lib/firestore";
import { listAllWalletEvents, listPendingTopUps } from "@/lib/wallet";
import { decideTopUpAction } from "@/app/actions/wallet";
import { TOPUP_METHOD_LABELS, formatPeso, type TopUpMethod } from "@/lib/catalog";
import { BlurFade } from "@/components/mp/blur-fade";
import { AnimatedNumber } from "@/components/mp/animated-number";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect(`/${profile.role ?? "seeker"}`);

  const params = await searchParams;
  const banner = typeof params.decided === "string"
    ? params.decided === "approved"
      ? "Top-up approved — credits posted."
      : "Top-up rejected."
    : typeof params.error === "string"
      ? params.error
      : null;

  const [pendingTopUps, users, events, listings] = await Promise.all([
    listPendingTopUps(),
    listProfiles(50),
    listAllWalletEvents(15),
    browseServices(),
  ]);
  const providerCount = users.filter((u) => u.role === "provider").length;

  return (
    <div className="mx-auto w-full max-w-md">
      <BlurFade delay={0}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--c-text-2)" }}>
            Admin console
          </span>
          <span className="cc-badge" style={{ background: "#fdf3dc", color: "#8a5a00" }}>
            {profile.fullName}
          </span>
        </div>
        <h1 className="mb-5 text-[26px] font-semibold tracking-tight">Operations</h1>
      </BlurFade>

      {banner && (
        <BlurFade delay={0.04}>
          <div
            className="cc-card mb-4 text-xs leading-relaxed"
            style={{ boxShadow: "0 0 0 1px var(--c-accent), var(--shadow-border)" }}
          >
            {banner}
          </div>
        </BlurFade>
      )}

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        {[
          { label: "Users", value: users.length },
          { label: "Providers", value: providerCount },
          { label: "Active listings", value: listings.length },
        ].map((stat, i) => (
          <BlurFade key={stat.label} delay={0.04 * i}>
            <div className="cc-card text-center">
              <div className="text-[26px] font-semibold leading-tight tracking-tight">
                <AnimatedNumber value={stat.value} />
              </div>
              <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                {stat.label}
              </div>
            </div>
          </BlurFade>
        ))}
      </div>

      {/* Pending top-ups */}
      <BlurFade delay={0.12}>
        <h2 className="mb-2.5 text-sm font-semibold">
          Top-up approvals{" "}
          {pendingTopUps.length > 0 && (
            <span className="cc-badge ml-1" style={{ background: "#fdf3dc", color: "#8a5a00" }}>
              {pendingTopUps.length} pending
            </span>
          )}
        </h2>
      </BlurFade>
      <div className="mb-5 flex flex-col gap-3">
        {pendingTopUps.length === 0 && (
          <BlurFade delay={0.14}>
            <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
              No pending top-up requests.
            </div>
          </BlurFade>
        )}
        {pendingTopUps.map((t, i) => (
          <BlurFade key={t.id} delay={0.14 + i * 0.07}>
            <div className="cc-card">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[15px] font-semibold cc-num">{formatPeso(t.amount)}</div>
                  <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                    {t.requesterName} · {TOPUP_METHOD_LABELS[t.method as TopUpMethod] ?? t.method} · ref{" "}
                    {t.refNumber}
                  </div>
                </div>
              </div>
              <form action={decideTopUpAction} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="requestId" value={t.id} />
                <input
                  name="note"
                  className="cc-input"
                  style={{ minHeight: 38, fontSize: 13 }}
                  placeholder="Note (optional, kept in the ledger)"
                  maxLength={120}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    className="cc-btn cc-btn-primary"
                    style={{ width: "auto", minHeight: 40, fontSize: 13, padding: "0 16px" }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    className="cc-btn cc-btn-secondary"
                    style={{ width: "auto", minHeight: 40, fontSize: 13, padding: "0 16px" }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </form>
            </div>
          </BlurFade>
        ))}
      </div>

      {/* Users */}
      <BlurFade delay={0.12}>
        <h2 className="mb-2.5 text-sm font-semibold">Recent users</h2>
      </BlurFade>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ color: "var(--c-text-3)" }}>
              <th className="py-1.5 pr-2 font-medium">Name</th>
              <th className="py-1.5 pr-2 font-medium">Role</th>
              <th className="py-1.5 pr-2 font-medium">Credits</th>
              <th className="py-1.5 pr-2 font-medium">Jobs</th>
              <th className="py-1.5 font-medium">Mobile</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} style={{ borderTop: "1px solid var(--c-border)" }}>
                <td className="py-2 pr-2">
                  <div className="font-semibold">{u.fullName}</div>
                  <div style={{ color: "var(--c-text-3)" }}>{u.email}</div>
                </td>
                <td className="py-2 pr-2">
                  {u.role ? (
                    <span
                      className="cc-badge"
                      style={
                        u.role === "admin"
                          ? { background: "#fdf3dc", color: "#8a5a00" }
                          : u.role === "provider"
                            ? { background: "var(--c-success-light)", color: "var(--c-success)" }
                            : { background: "var(--c-accent-light)", color: "var(--c-accent)" }
                      }
                    >
                      {u.role}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-2 cc-num">{u.role === "provider" ? formatPeso(u.credits) : "—"}</td>
                <td className="py-2 pr-2 cc-num">{u.role === "provider" ? (u.completedCount ?? 0) : "—"}</td>
                <td className="py-2 cc-num" style={{ color: "var(--c-text-2)" }}>
                  {u.mobile}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ledger */}
      <BlurFade delay={0.12}>
        <h2 className="mb-2.5 text-sm font-semibold">Platform ledger (latest)</h2>
      </BlurFade>
      <div className="flex flex-col gap-2.5">
        {events.length === 0 && (
          <BlurFade delay={0.14}>
            <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
              No ledger events yet.
            </div>
          </BlurFade>
        )}
        {events.map((e, i) => (
          <BlurFade key={e.id} delay={0.14 + i * 0.05}>
            <div className="cc-card flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {e.type === "topup" ? "Top-up" : e.type === "free_accept" ? "Free accept" : "Accept fee"}
                </div>
                <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                  {e.uid.slice(0, 6)}… · {e.note}
                </div>
              </div>
              <div
                className="text-sm font-semibold cc-num"
                style={{ color: e.amount > 0 ? "var(--c-success)" : e.amount < 0 ? "var(--c-danger)" : "var(--c-text-2)" }}
              >
                {e.amount > 0 ? "+" : ""}
                {e.amount === 0 ? "₱0" : formatPeso(e.amount)}
              </div>
            </div>
          </BlurFade>
        ))}
      </div>
    </div>
  );
}
