import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { browseServices, listProfiles } from "@/lib/firestore";
import { listAllWalletEvents, listPendingTopUps } from "@/lib/wallet";
import { decideTopUpAction } from "@/app/actions/wallet";
import { TOPUP_METHOD_LABELS, formatPeso, type TopUpMethod } from "@/lib/catalog";

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
      <p className="mb-1 text-xs" style={{ color: "var(--c-text-2)" }}>
        Admin console · {profile.fullName}
      </p>
      <h1 className="mb-4 text-lg font-semibold">Operations</h1>

      {banner && (
        <div className="cc-card mb-4 text-xs leading-relaxed" style={{ borderColor: "var(--c-accent)" }}>
          {banner}
        </div>
      )}

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        {[
          ["Users", String(users.length)],
          ["Providers", String(providerCount)],
          ["Active listings", String(listings.length)],
        ].map(([label, value]) => (
          <div key={label} className="cc-card text-center">
            <div className="text-xl font-semibold">{value}</div>
            <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Pending top-ups */}
      <h2 className="mb-2 text-sm font-semibold">
        Top-up approvals {pendingTopUps.length > 0 && `(${pendingTopUps.length})`}
      </h2>
      <div className="mb-5 flex flex-col gap-3">
        {pendingTopUps.length === 0 && (
          <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
            No pending top-up requests.
          </div>
        )}
        {pendingTopUps.map((t) => (
          <div key={t.id} className="cc-card">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{formatPeso(t.amount)}</div>
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
                  style={{ width: "auto", minHeight: 38, fontSize: 13, padding: "0 16px" }}
                >
                  ✓ Approve
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="rejected"
                  className="cc-btn cc-btn-secondary"
                  style={{ width: "auto", minHeight: 38, fontSize: 13, padding: "0 16px" }}
                >
                  ✕ Reject
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>

      {/* Users */}
      <h2 className="mb-2 text-sm font-semibold">Recent users</h2>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ color: "var(--c-text-3)" }}>
              <th className="py-1.5 pr-2 font-medium">Name</th>
              <th className="py-1.5 pr-2 font-medium">Role</th>
              <th className="py-1.5 pr-2 font-medium">Credits</th>
              <th className="py-1.5 font-medium">Mobile</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} style={{ borderTop: "1px solid var(--c-border)" }}>
                <td className="py-1.5 pr-2">
                  <div className="font-medium">{u.fullName}</div>
                  <div style={{ color: "var(--c-text-3)" }}>{u.email}</div>
                </td>
                <td className="py-1.5 pr-2">{u.role ?? "—"}</td>
                <td className="py-1.5 pr-2">{u.role === "provider" ? formatPeso(u.credits) : "—"}</td>
                <td className="py-1.5" style={{ color: "var(--c-text-2)" }}>
                  {u.mobile}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ledger */}
      <h2 className="mb-2 text-sm font-semibold">Platform ledger (latest)</h2>
      <div className="flex flex-col gap-2">
        {events.length === 0 && (
          <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
            No ledger events yet.
          </div>
        )}
        {events.map((e) => (
          <div key={e.id} className="cc-card flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">
                {e.type === "topup" ? "Top-up" : e.type === "free_accept" ? "Free accept" : "Accept fee"}
              </div>
              <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                {e.uid.slice(0, 6)}… · {e.note}
              </div>
            </div>
            <div className="text-sm font-semibold" style={{ color: e.amount > 0 ? "#1e6b2e" : e.amount < 0 ? "var(--c-danger)" : "var(--c-text-2)" }}>
              {e.amount > 0 ? "+" : ""}
              {e.amount === 0 ? "₱0" : formatPeso(e.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
