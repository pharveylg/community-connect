import Link from "next/link";
import { formatPeso } from "@/lib/catalog";
import {
  reportJobAds,
  reportCategories,
  reportModeration,
  reportFinancials,
  reportProviders,
  reportUsers,
  reportStorage,
  readSnapshots,
  type ReportWindow,
} from "@/lib/reports";
import { cleanHousekeepingAction } from "@/app/actions/reports";

// Admin Reports tab — 7 sections, window selector, CSV export, housekeeping.
// Server-rendered; all interactivity is links + two plain forms.

const SECTIONS = [
  { id: "ads", label: "📋 Job ads" },
  { id: "categories", label: "🧭 Categories" },
  { id: "moderation", label: "🚨 Moderation" },
  { id: "financials", label: "💳 Financials" },
  { id: "providers", label: "🏆 Providers" },
  { id: "users", label: "👥 Users" },
  { id: "storage", label: "🗄️ Storage" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const WINDOWS: { id: ReportWindow; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All-time" },
];

const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)}%`);
const hrs = (x: number | null | undefined) => (x === null || x === undefined ? "—" : x >= 48 ? `${(x / 24).toFixed(1)}d` : `${x.toFixed(1)}h`);
const num = (x: number | null | undefined) => (x === null || x === undefined ? "—" : x.toLocaleString("en-PH"));

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="cc-card p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--c-text-3)" }}>
        {label}
      </div>
      <div className="cc-num mt-0.5 text-lg font-bold">{value}</div>
      {hint ? (
        <div className="text-[10.5px]" style={{ color: "var(--c-text-3)" }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) {
    return <div className="cc-card p-3 text-[11px]" style={{ color: "var(--c-text-3)" }}>{label}: fills in as daily snapshots accumulate</div>;
  }
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 120},${28 - (v / max) * 24}`).join(" ");
  return (
    <div className="cc-card p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--c-text-3)" }}>
        {label}
      </div>
      <svg viewBox="0 0 120 30" className="mt-1 h-8 w-full" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke="var(--c-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const th = "px-2.5 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide whitespace-nowrap";
const td = "px-2.5 py-2 text-xs whitespace-nowrap";

export default async function AdminReports({
  section: sectionParam,
  window: windowParam,
}: {
  section: string;
  window: string;
}) {
  const section: SectionId = SECTIONS.some((s) => s.id === sectionParam) ? (sectionParam as SectionId) : "ads";
  const w: ReportWindow = (["7d", "30d", "all"] as const).includes(windowParam as ReportWindow) ? (windowParam as ReportWindow) : "30d";
  const href = (s: SectionId, ww: ReportWindow = w) => `/admin?tab=reports&s=${s}&w=${ww}`;

  return (
    <div>
      {/* section chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <Link key={s.id} href={href(s.id)} className={"cc-chip " + (section === s.id ? "cc-chip-active" : "")}>
            {s.label}
          </Link>
        ))}
      </div>
      {/* window selector + export */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {WINDOWS.map((win) => (
            <Link key={win.id} href={href(section, win.id)} className={"cc-chip " + (w === win.id ? "cc-chip-active" : "")}>
              {win.label}
            </Link>
          ))}
        </div>
        <a href={`/api/reports/export?section=${section}&window=${w}`} className="cc-btn cc-btn-ghost" style={{ width: "auto", minHeight: 34, fontSize: 12, padding: "0 12px" }}>
          ⬇ Export CSV
        </a>
      </div>

      {section === "ads" && <AdsSection w={w} />}
      {section === "categories" && <CategoriesSection w={w} />}
      {section === "moderation" && <ModerationSection w={w} />}
      {section === "financials" && <FinancialsSection w={w} />}
      {section === "providers" && <ProvidersSection w={w} />}
      {section === "users" && <UsersSection w={w} />}
      {section === "storage" && <StorageSection />}
    </div>
  );
}

// --- 1 · Job ads -----------------------------------------------------------

async function AdsSection({ w }: { w: ReportWindow }) {
  const r = await reportJobAds(w);
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-5">
        <Kpi label="Active ads" value={num(r.kpis.active)} />
        <Kpi label="New in window" value={num(r.kpis.newInWindow)} />
        <Kpi label="Interests sent" value={num(r.kpis.interests)} />
        <Kpi label="Shortlist rate" value={pct(r.kpis.shortlistRate)} hint="shortlisted ÷ interests" />
        <Kpi label="Time to shortlist" value={r.kpis.medianDaysToShortlist === null ? "—" : `${r.kpis.medianDaysToShortlist.toFixed(1)}d`} hint="median" />
      </div>
      {(r.topTitles.length > 0 || r.topPosters.length > 0) && (
        <div className="mb-4 grid gap-2.5 md:grid-cols-2">
          <div className="cc-card p-3">
            <div className="mb-1.5 text-xs font-bold">🔁 Repeated titles (demand signal)</div>
            {r.topTitles.map((t) => (
              <div key={t.title} className="flex justify-between text-[11.5px]">
                <span className="truncate">{t.title}</span>
                <span className="cc-num">{t.n}×</span>
              </div>
            ))}
            {r.topTitles.length === 0 && <div className="text-[11px]" style={{ color: "var(--c-text-3)" }}>No repeats in window.</div>}
          </div>
          <div className="cc-card p-3">
            <div className="mb-1.5 text-xs font-bold">👥 Most active posters</div>
            {r.topPosters.map((t) => (
              <div key={t.poster} className="flex justify-between text-[11.5px]">
                <span className="truncate">{t.poster}</span>
                <span className="cc-num">{t.n} ads</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="cc-card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr className="border-b" style={{ borderColor: "var(--c-line)" }}>
            <th className={th}>Ad</th><th className={th}>Poster</th><th className={th}>Posted</th><th className={th}>Status</th><th className={th}>Interests</th><th className={th}>Shortlisted</th><th className={th}>→ Shortlist</th>
          </tr></thead>
          <tbody>
            {r.rows.slice(0, 40).map((x) => (
              <tr key={x.id} className="border-b last:border-0" style={{ borderColor: "var(--c-line)" }}>
                <td className={td + " max-w-[220px] truncate font-semibold"}>{x.title}</td>
                <td className={td}>{x.poster}</td>
                <td className={td}>{x.postedAt?.toLocaleDateString("en-PH") ?? "—"}</td>
                <td className={td}><span className="cc-chip" style={{ fontSize: 10.5 }}>{x.status}</span></td>
                <td className={td + " cc-num"}>{x.interests}</td>
                <td className={td + " cc-num"}>{x.shortlisted}</td>
                <td className={td + " cc-num"}>{x.daysToShortlist === null ? "—" : `${x.daysToShortlist.toFixed(1)}d`}</td>
              </tr>
            ))}
            {r.rows.length === 0 && <tr><td className={td} colSpan={7}>No ads in this window.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 2 · Categories ---------------------------------------------------------

async function CategoriesSection({ w }: { w: ReportWindow }) {
  const r = await reportCategories(w);
  return (
    <div>
      <div className="cc-card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr className="border-b" style={{ borderColor: "var(--c-line)" }}>
            <th className={th}>Category</th><th className={th}>Services (active)</th><th className={th}>Providers</th><th className={th}>₱/hr med</th><th className={th}>₱/day med</th><th className={th}>Seeker posts</th><th className={th}>Offers</th><th className={th}>Offer→accept</th><th className={th}>Bookings</th><th className={th}>Completion</th><th className={th}>Posts/provider</th>
          </tr></thead>
          <tbody>
            {r.rows.map((x) => (
              <tr key={x.slug} className="border-b last:border-0" style={{ borderColor: "var(--c-line)" }}>
                <td className={td + " font-semibold"}>{x.label}</td>
                <td className={td + " cc-num"}>{x.servicesActive}</td>
                <td className={td + " cc-num"}>{x.providers}</td>
                <td className={td + " cc-num"}>{x.medianHourly === null ? "—" : formatPeso(x.medianHourly)}</td>
                <td className={td + " cc-num"}>{x.medianDaily === null ? "—" : formatPeso(x.medianDaily)}</td>
                <td className={td + " cc-num"}>{x.seekerPosts}</td>
                <td className={td + " cc-num"}>{x.offers}</td>
                <td className={td + " cc-num"}>{pct(x.offerAcceptRate)}</td>
                <td className={td + " cc-num"}>{x.bookings}</td>
                <td className={td + " cc-num"}>{pct(x.completionRate)}</td>
                <td className={td + " cc-num"}>{x.demandPerProvider === null ? "—" : x.demandPerProvider.toFixed(1)}</td>
              </tr>
            ))}
            {r.rows.length === 0 && <tr><td className={td} colSpan={11}>Nothing in this window yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {r.customTitles.length > 0 && (
        <div className="cc-card mt-4 p-3">
          <div className="mb-1.5 text-xs font-bold">✨ Custom (unlisted) service types in the wild</div>
          <div className="flex flex-wrap gap-1.5">
            {r.customTitles.map((c) => (
              <span key={c.title} className="cc-chip" style={{ fontSize: 10.5 }}>
                {c.title}{c.n > 1 ? ` ×${c.n}` : ""}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px]" style={{ color: "var(--c-text-3)" }}>
            Repeated ones are candidates for the official catalog.
          </p>
        </div>
      )}
    </div>
  );
}

// --- 3 · Moderation ---------------------------------------------------------

async function ModerationSection({ w }: { w: ReportWindow }) {
  const r = await reportModeration(w);
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-5">
        <Kpi label="Reports filed" value={num(r.kpis.reports)} />
        <Kpi label="Auto-hidden" value={num(r.kpis.autoHides)} hint="3-report tripwire" />
        <Kpi label="Resolved" value={num(r.kpis.resolved)} />
        <Kpi label="Unresolved (all-time)" value={num(r.kpis.pending)} />
        <Kpi label="False-positive rate" value={r.kpis.falsePositiveRate === null ? "—" : pct(r.kpis.falsePositiveRate)} hint="restored ÷ tripwire hides" />
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        <div className="cc-card overflow-x-auto p-0">
          <div className="px-2.5 pt-2.5 text-xs font-bold">🚩 Repeat targets (3+ reports, all-time)</div>
          <table className="w-full">
            <thead><tr><th className={th}>Target</th><th className={th}>Type</th><th className={th}>Reports</th><th className={th}>Last</th></tr></thead>
            <tbody>
              {r.repeatOffenders.map((x) => (
                <tr key={x.targetId}>
                  <td className={td + " max-w-[180px] truncate font-semibold"}>{x.title}</td>
                  <td className={td}>{x.targetType}</td>
                  <td className={td + " cc-num"}>{x.reports}</td>
                  <td className={td}>{x.lastAt?.toLocaleDateString("en-PH") ?? "—"}</td>
                </tr>
              ))}
              {r.repeatOffenders.length === 0 && <tr><td className={td} colSpan={4}>None — clean window.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="cc-card overflow-x-auto p-0">
          <div className="px-2.5 pt-2.5 text-xs font-bold">🗂 Recent resolved reports</div>
          <table className="w-full">
            <thead><tr><th className={th}>Target</th><th className={th}>Outcome</th><th className={th}>By</th><th className={th}>When</th></tr></thead>
            <tbody>
              {r.recentDecisions.map((x, i) => (
                <tr key={i}>
                  <td className={td + " max-w-[180px] truncate font-semibold"}>{x.title}</td>
                  <td className={td}>{x.action}</td>
                  <td className={td + " max-w-[120px] truncate"}>{x.by ?? "—"}</td>
                  <td className={td}>{x.at?.toLocaleDateString("en-PH") ?? "—"}</td>
                </tr>
              ))}
              {r.recentDecisions.length === 0 && <tr><td className={td} colSpan={4}>No decisions in window.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- 4 · Financials ---------------------------------------------------------

async function FinancialsSection({ w }: { w: ReportWindow }) {
  const [r, snaps] = await Promise.all([reportFinancials(w), readSnapshots(30)]);
  const conv = r.kpis.providerCount > 0 ? r.kpis.payingProviders / r.kpis.providerCount : null;
  return (
    <div>
      <p className="mb-3 text-[11px]" style={{ color: "var(--c-text-3)" }}>
        Users pay each other off-platform — platform money is credits. Top-ups are cash received; accept fees are credits consumed; float is credits sold but unused.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Top-ups approved" value={formatPeso(r.kpis.topupPeso)} hint={`${r.kpis.topupCount} ×`} />
        <Kpi label="Accept-fee revenue" value={formatPeso(r.kpis.feeRevenue)} hint={`${r.kpis.freeAccepts} free accepts`} />
        <Kpi label="Float liability" value={formatPeso(r.kpis.floatLiability)} hint="unused credits" />
        <Kpi label="Pending top-ups" value={formatPeso(r.kpis.pendingPeso)} hint={`${r.kpis.pendingCount} waiting`} />
        <Kpi label="Paying providers" value={num(r.kpis.payingProviders)} hint="ever paid a fee" />
        <Kpi label="Freemium conversion" value={pct(conv)} hint="paying ÷ providers" />
        <Sparkline values={snaps.map((s) => s.completedBookings)} label="Completed bookings (total)" />
      </div>
      <div className="cc-card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr className="border-b" style={{ borderColor: "var(--c-line)" }}>
            <th className={th}>Month</th><th className={th}>Top-ups ₱</th><th className={th}>Accept fees ₱</th><th className={th}>Providers with paid events</th>
          </tr></thead>
          <tbody>
            {r.monthly.map((m) => (
              <tr key={m.month} className="border-b last:border-0" style={{ borderColor: "var(--c-line)" }}>
                <td className={td + " font-semibold"}>{m.month}</td>
                <td className={td + " cc-num"}>{formatPeso(m.topups)}</td>
                <td className={td + " cc-num"}>{formatPeso(m.fees)}</td>
                <td className={td + " cc-num"}>{m.activeProviders}</td>
              </tr>
            ))}
            {r.monthly.length === 0 && <tr><td className={td} colSpan={4}>No wallet events yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {r.drift && (
        <p className="mt-3 text-[11px]" style={{ color: r.drift.mismatches > 0 ? "var(--c-danger)" : "var(--c-text-3)" }}>
          {r.drift.mismatches > 0
            ? `⚠️ Ledger drift: ${r.drift.mismatches}/${r.drift.checked} profiles hold credits that don't match their last wallet event — investigate.`
            : `✓ Ledger reconciles: ${r.drift.checked} profiles match their last wallet event.`}
        </p>
      )}
    </div>
  );
}

// --- 5 · Providers ----------------------------------------------------------

async function ProvidersSection({ w }: { w: ReportWindow }) {
  const r = await reportProviders(w);
  const withReceived = r.filter((p) => p.received > 0);
  const medAccept = withReceived.length > 0 ? withReceived.reduce((s, p) => s + (p.acceptRate ?? 0), 0) / withReceived.length : null;
  const vouched = r.filter((p) => p.vouches > 0);
  const medVouchRate = vouched.length > 0 ? vouched.reduce((s, p) => s + (p.vouchRate ?? 0), 0) / vouched.length : null;
  const watchlist = r.filter((p) => p.activity === "red");
  const flag = { green: "🟢", yellow: "🟡", red: "🔴" };

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-5">
        <Kpi label="Providers" value={num(r.length)} />
        <Kpi label="Median accept rate" value={pct(medAccept)} hint="window, decided bookings" />
        <Kpi label="Median vouch rate" value={pct(medVouchRate)} hint="vouches ÷ completed (all-time)" />
        <Kpi label="Fee-paying" value={num(r.filter((p) => p.everPaid).length)} hint="ever paid a ₱20 accept fee" />
        <Kpi label="🔴 Watchlist" value={num(watchlist.length)} hint="topped up, zero completions" />
      </div>

      {watchlist.length > 0 && (
        <div className="cc-card mb-4 p-3">
          <div className="mb-1.5 text-xs font-bold">🔴 Watchlist — money in, nothing delivered</div>
          {watchlist.map((p) => (
            <div key={p.uid} className="flex justify-between text-[11.5px]">
              <span>{p.name} — {formatPeso(p.topupPeso)} topped up, {p.credits} credits still held</span>
            </div>
          ))}
        </div>
      )}

      <div className="cc-card overflow-x-auto p-0">
        <div className="px-2.5 pt-2.5 text-xs font-bold">All providers — delivery vs spend (window: bookings & offers; lifetime: vouches, tier, money)</div>
        <table className="w-full">
          <thead><tr className="border-b" style={{ borderColor: "var(--c-line)" }}>
            <th className={th}>Provider</th><th className={th}>Tier</th><th className={th}>Recv</th><th className={th}>Acc</th><th className={th}>Dec</th><th className={th}>Done</th><th className={th}>Accept</th><th className={th}>Respond</th><th className={th}>Fulfill</th><th className={th}>Vouches</th><th className={th}>Vouch rate</th><th className={th}>Offers</th><th className={th}>Won</th><th className={th}>Top-ups ₱</th><th className={th}>Fees ₱</th><th className={th}>Credits</th><th className={th}>Done/₱1k</th><th className={th}>·</th>
          </tr></thead>
          <tbody>
            {r.map((p) => (
              <tr key={p.uid} className="border-b last:border-0" style={{ borderColor: "var(--c-line)" }}>
                <td className={td + " font-semibold"}>{p.name}{p.verified ? " ✅" : ""}</td>
                <td className={td}>{p.tier}</td>
                <td className={td + " cc-num"}>{p.received}</td>
                <td className={td + " cc-num"}>{p.accepted}</td>
                <td className={td + " cc-num"}>{p.declined}</td>
                <td className={td + " cc-num"}>{p.completed}</td>
                <td className={td + " cc-num"}>{pct(p.acceptRate)}</td>
                <td className={td + " cc-num"}>{hrs(p.medianResponseHrs)}</td>
                <td className={td + " cc-num"}>{hrs(p.medianFulfillmentHrs)}</td>
                <td className={td + " cc-num"}>{p.vouches}{p.vouchesInWindow > 0 ? ` (+${p.vouchesInWindow})` : ""}</td>
                <td className={td + " cc-num"}>{pct(p.vouchRate)}</td>
                <td className={td + " cc-num"}>{p.offersMade}</td>
                <td className={td + " cc-num"}>{p.offersSelected}</td>
                <td className={td + " cc-num"}>{p.topupPeso > 0 ? formatPeso(p.topupPeso) : "—"}</td>
                <td className={td + " cc-num"}>{p.feesPaidPeso > 0 ? formatPeso(p.feesPaidPeso) : "—"}</td>
                <td className={td + " cc-num"}>{p.credits}</td>
                <td className={td + " cc-num"}>{p.deliveryPerPeso === null ? "—" : p.deliveryPerPeso.toFixed(2)}</td>
                <td className={td}>{flag[p.activity]}</td>
              </tr>
            ))}
            {r.length === 0 && <tr><td className={td} colSpan={18}>No providers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 6 · Users --------------------------------------------------------------

async function UsersSection({ w }: { w: ReportWindow }) {
  const [r, snaps] = await Promise.all([reportUsers(w), readSnapshots(30)]);
  const maxLadder = Math.max(...r.trustLadder.map((t) => t.n), 1);
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Total users" value={num(r.kpis.total)} />
        <Kpi label="Providers" value={num(r.kpis.providers)} />
        <Kpi label="Seekers" value={num(r.kpis.seekers)} />
        <Kpi label="New in window" value={num(r.kpis.newInWindow)} />
        <Kpi label="Verified providers" value={num(r.kpis.verifiedProviders)} hint={pct(r.kpis.providerVerifyRate) + " of providers"} />
        <Sparkline values={snaps.map((s) => s.users)} label="Users (total)" />
        <Sparkline values={r.signupDays.map((d) => d.n)} label="Signups/day" />
      </div>
      <div className="cc-card p-3">
        <div className="mb-2 text-xs font-bold">🪜 Trust ladder (providers by lifetime completions)</div>
        {r.trustLadder.map((t) => (
          <div key={t.tier} className="mb-1.5 flex items-center gap-2">
            <span className="w-14 text-[11.5px] font-semibold">{t.tier}</span>
            <div className="h-3.5 flex-1 rounded-full" style={{ background: "var(--c-surface)" }}>
              <div className="h-3.5 rounded-full" style={{ width: `${(t.n / maxLadder) * 100}%`, background: "var(--c-accent)" }} />
            </div>
            <span className="cc-num w-8 text-right text-[11.5px] font-bold">{t.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 7 · Storage ------------------------------------------------------------

function bytesLabel(b: number): string {
  if (b > 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`;
  if (b > 1_000) return `${(b / 1_000).toFixed(1)} KB`;
  return `${b} B`;
}

async function StorageSection() {
  const r = await reportStorage();
  const total = r.collections.reduce((s, c) => s + c.estBytes, 0);
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Kpi label="Collections tracked" value={num(r.collections.length)} />
        <Kpi label="Total docs" value={num(r.collections.reduce((s, c) => s + c.docs, 0))} />
        <Kpi label="Estimated size" value={bytesLabel(total)} hint="sampled avg × count" />
        <Kpi label="Cleanup candidates" value={num(r.cleanup.reduce((s, c) => s + c.count, 0))} hint="docs reclaimable now" />
      </div>
      <div className="cc-card mb-4 overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr className="border-b" style={{ borderColor: "var(--c-line)" }}>
            <th className={th}>Collection</th><th className={th}>Docs</th><th className={th}>Est. size</th><th className={th}>Share</th>
          </tr></thead>
          <tbody>
            {r.collections.map((c) => (
              <tr key={c.name} className="border-b last:border-0" style={{ borderColor: "var(--c-line)" }}>
                <td className={td + " font-semibold"}>{c.name}</td>
                <td className={td + " cc-num"}>{num(c.docs)}</td>
                <td className={td + " cc-num"}>{bytesLabel(c.estBytes)}</td>
                <td className={td}>
                  <div className="h-2 w-24 rounded-full" style={{ background: "var(--c-surface)" }}>
                    <div className="h-2 rounded-full" style={{ width: `${total > 0 ? Math.max(2, (c.estBytes / total) * 100) : 0}%`, background: "var(--c-accent)" }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        {r.cleanup.map((c) => (
          <form key={c.key} action={cleanHousekeepingAction} className="cc-card p-3">
            <input type="hidden" name="kind" value={c.key} />
            <div className="text-xs font-bold">{c.label}</div>
            <div className="mt-0.5 text-[11px]" style={{ color: "var(--c-text-3)" }}>{c.rule}</div>
            <div className="cc-num mt-2 text-sm font-bold">{num(c.count)} docs · ~{bytesLabel(c.estBytes)}</div>
            <input
              name="confirm"
              placeholder="Type CLEAN to confirm"
              className="cc-input mt-2 text-xs"
              style={{ minHeight: 34 }}
              autoComplete="off"
            />
            <button type="submit" className="cc-btn cc-btn-primary mt-2 w-full" style={{ minHeight: 36, fontSize: 12.5 }}>
              Clean now
            </button>
          </form>
        ))}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: "var(--c-text-3)" }}>
        Cleanup deletes in batches of 400 and writes an audit_log entry. Counts are exact up to 1,000 docs per class. Sizes are estimates (8-doc sample × count), not bytes-exact.
      </p>
    </div>
  );
}
