import "server-only";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { SERVICE_CATEGORIES } from "@/lib/catalog";

// Reporting builders (admin Reports tab + CSV export + daily snapshot).
// Contract: bounded reads (capped queries), no indexes beyond single-field,
// serializable results. Numbers are computed in-memory from capped pulls —
// honest at seed scale, still fine into the low tens of thousands of docs.

export type ReportWindow = "7d" | "30d" | "all";

const CAP = 2000;
const AD_TTL_MS = 30 * 86400000;

function sinceFor(w: ReportWindow): Date | null {
  if (w === "all") return null;
  return new Date(Date.now() - (w === "7d" ? 7 : 30) * 86400000);
}

function inW(d: Date | null | undefined, since: Date | null): boolean {
  if (!d) return false;
  return since === null || d >= since;
}

function median(xs: number[]): number | null {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (s.length === 0) return null;
  return s[Math.floor(s.length / 2)];
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 86400000;
}

// Report rows are heterogeneous raw Firestore documents read generically.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = { [field: string]: any };

async function pull(col: string, w: ReportWindow, orderField = "createdAt"): Promise<Row[]> {
  void w; // windowed filtering happens in memory (see note above)
  const snap = await getAdminDb().collection(col).orderBy(orderField, "desc").limit(CAP).get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() ?? {}) }) as Row);
  // "all" windows keep the cap too (newest first). For older-than-CAP data
  // the storage section uses count() aggregations, so totals stay honest.
  return docs;
}

function dt(v: unknown): Date | null {
  return v instanceof Timestamp ? v.toDate() : null;
}

// ---------------------------------------------------------------------------
// 1 · Job ads (Trabaho)
// ---------------------------------------------------------------------------

export type JobAdsReport = {
  kpis: { active: number; newInWindow: number; interests: number; shortlistRate: number | null; medianDaysToShortlist: number | null };
  rows: { id: string; title: string; poster: string; postedAt: Date | null; status: string; interests: number; shortlisted: number; daysToShortlist: number | null }[];
  topTitles: { title: string; n: number }[];
  topPosters: { poster: string; n: number }[];
};

export async function reportJobAds(w: ReportWindow): Promise<JobAdsReport> {
  const since = sinceFor(w);
  const [ads, interests] = await Promise.all([pull("job_ads", w), pull("job_ad_interests", w)]);
  const now = Date.now();

  const active = ads.filter(
    (a) => a.status === "open" && !a.removedByModeration && (!a.createdAt || now - dt(a.createdAt)!.getTime() < AD_TTL_MS)
  ).length;

  const byAdInterests = new Map<string, { total: number; shortlisted: number; firstShortlistDays: number | null }>();
  const shortlistGaps: number[] = [];
  let interestsInW = 0;
  for (const it of interests) {
    if (!inW(dt(it.createdAt), since)) continue;
    interestsInW++;
    const rec = byAdInterests.get(it.adId) ?? { total: 0, shortlisted: 0, firstShortlistDays: null };
    rec.total++;
    if (it.status === "shortlisted") {
      rec.shortlisted++;
      const st = dt(it.shortlistedAt);
      const ct = dt(it.createdAt);
      if (st && ct) {
        const gap = daysBetween(ct, st);
        shortlistGaps.push(gap);
        if (rec.firstShortlistDays === null || gap < rec.firstShortlistDays) rec.firstShortlistDays = gap;
      }
    }
    byAdInterests.set(it.adId, rec);
  }

  const shortlisted = [...byAdInterests.values()].reduce((s, r) => s + r.shortlisted, 0);
  const rows: JobAdsReport["rows"] = ads
    .filter((a) => inW(dt(a.createdAt), since) || a.status === "open")
    .map((a) => {
      const r = byAdInterests.get(a.id) ?? { total: 0, shortlisted: 0, firstShortlistDays: null };
      const fresh = !a.createdAt || now - dt(a.createdAt)!.getTime() < AD_TTL_MS;
      const status = a.removedByModeration ? "removed" : a.status === "open" && !fresh ? "expired" : a.status;
      return {
        id: a.id,
        title: a.title ?? "(untitled)",
        poster: a.posterName ?? "?",
        postedAt: dt(a.createdAt),
        status,
        interests: r.total,
        shortlisted: r.shortlisted,
        daysToShortlist: r.firstShortlistDays,
      };
    })
    .sort((a, b) => b.interests - a.interests || b.shortlisted - a.shortlisted);

  const titleCount = new Map<string, number>();
  for (const a of ads) {
    if (!inW(dt(a.createdAt), since)) continue;
    const key = String(a.title ?? "").toLowerCase().trim().slice(0, 60);
    if (key) titleCount.set(key, (titleCount.get(key) ?? 0) + 1);
  }
  const posterCount = new Map<string, number>();
  for (const a of ads) {
    if (!inW(dt(a.createdAt), since)) continue;
    posterCount.set(a.posterName ?? "?", (posterCount.get(a.posterName ?? "?") ?? 0) + 1);
  }

  return {
    kpis: {
      active,
      newInWindow: ads.filter((a) => inW(dt(a.createdAt), since)).length,
      interests: interestsInW,
      shortlistRate: interestsInW > 0 ? shortlisted / interestsInW : null,
      medianDaysToShortlist: median(shortlistGaps),
    },
    rows,
    topTitles: [...titleCount.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([title, n]) => ({ title, n })),
    topPosters: [...posterCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([poster, n]) => ({ poster, n })),
  };
}

// ---------------------------------------------------------------------------
// 2 · Service categories (seeker vs provider)
// ---------------------------------------------------------------------------

export type CategoryRow = {
  slug: string;
  label: string;
  servicesActive: number;
  providers: number;
  medianHourly: number | null;
  medianDaily: number | null;
  seekerPosts: number;
  offers: number;
  offerAcceptRate: number | null;
  bookings: number;
  completionRate: number | null;
  demandPerProvider: number | null;
};

export type CategoriesReport = { rows: CategoryRow[]; customTitles: { title: string; n: number }[] };

export async function reportCategories(w: ReportWindow): Promise<CategoriesReport> {
  const since = sinceFor(w);
  const [services, posts, offers, bookings] = await Promise.all([
    pull("services", w),
    pull("job_posts", w),
    pull("job_offers", w),
    pull("bookings", w),
  ]);

  const postsWithOffer = new Set(offers.filter((o) => inW(dt(o.createdAt), since)).map((o) => o.postId));
  const postsAccepted = new Set(posts.filter((p) => p.acceptedOfferId).map((p) => p.id));

  const rows = new Map<string, CategoryRow>();
  const rowFor = (slug: string, label: string): CategoryRow => {
    let r = rows.get(slug);
    if (!r) {
      r = { slug, label, servicesActive: 0, providers: 0, medianHourly: null, medianDaily: null, seekerPosts: 0, offers: 0, offerAcceptRate: null, bookings: 0, completionRate: null, demandPerProvider: null };
      rows.set(slug, r);
    }
    return r;
  };
  for (const c of SERVICE_CATEGORIES) rowFor(c.slug, c.label);

  const svcProviders = new Map<string, Set<string>>();
  const hourly = new Map<string, number[]>();
  const daily = new Map<string, number[]>();
  const svcCat = new Map<string, string>(); // serviceId -> slug for bookings join
  for (const s of services) {
    if (s.removedByModeration) continue;
    svcCat.set(s.id, s.categorySlug);
    if (!s.custom && s.active && inW(dt(s.createdAt), since)) {
      const r = rowFor(s.categorySlug, s.categoryLabel ?? s.categorySlug);
      r.servicesActive++;
      const set = svcProviders.get(s.categorySlug) ?? new Set<string>();
      set.add(s.providerUid);
      svcProviders.set(s.categorySlug, set);
      if (s.rateType === "hourly" || s.rateType === "daily") {
        const m = s.rateType === "hourly" ? hourly : daily;
        m.set(s.categorySlug, [...(m.get(s.categorySlug) ?? []), Number(s.rateAmount) || 0].filter((x) => x > 0));
      }
    }
  }

  const offersByPost = new Map<string, number>();
  for (const o of offers) {
    if (!inW(dt(o.createdAt), since)) continue;
    offersByPost.set(o.postId, (offersByPost.get(o.postId) ?? 0) + 1);
  }

  for (const p of posts) {
    if (!inW(dt(p.createdAt), since) || p.removedByModeration) continue;
    const r = rowFor(p.categorySlug, p.categorySlug);
    r.seekerPosts++;
    r.offers += offersByPost.get(p.id) ?? 0;
  }

  const bookByCat = new Map<string, { total: number; completed: number }>();
  for (const b of bookings) {
    if (!inW(dt(b.createdAt), since)) continue;
    const slug = svcCat.get(b.serviceId) ?? "other";
    const rec = bookByCat.get(slug) ?? { total: 0, completed: 0 };
    rec.total++;
    if (b.status === "completed") rec.completed++;
    bookByCat.set(slug, rec);
  }

  for (const r of rows.values()) {
    const provs = (svcProviders.get(r.slug) ?? new Set()).size;
    r.providers = provs;
    r.medianHourly = median(hourly.get(r.slug) ?? []);
    r.medianDaily = median(daily.get(r.slug) ?? []);
    const bk = bookByCat.get(r.slug);
    if (bk) {
      r.bookings = bk.total;
      r.completionRate = bk.total > 0 ? bk.completed / bk.total : null;
    }
    const postIdsWithOffersInCat = [...postsWithOffer].filter((pid) => {
      const p = posts.find((x) => x.id === pid);
      return p && p.categorySlug === r.slug;
    }).length;
    const acceptedInCat = posts.filter((p) => p.categorySlug === r.slug && postsAccepted.has(p.id)).length;
    if (postIdsWithOffersInCat > 0) r.offerAcceptRate = acceptedInCat / postIdsWithOffersInCat;
    if (provs > 0) r.demandPerProvider = r.seekerPosts / provs;
  }

  const customTitles = new Map<string, number>();
  for (const s of services) {
    if (s.custom && s.active && inW(dt(s.createdAt), since)) {
      const t = String(s.title ?? "Custom").trim().slice(0, 40) || "Custom";
      customTitles.set(t, (customTitles.get(t) ?? 0) + 1);
    }
  }

  return {
    rows: [...rows.values()].filter((r) => r.servicesActive + r.seekerPosts + r.bookings > 0).sort((a, b) => b.seekerPosts - a.seekerPosts),
    customTitles: [...customTitles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title, n]) => ({ title, n })),
  };
}

// ---------------------------------------------------------------------------
// 3 · Moderation
// ---------------------------------------------------------------------------

export type ModerationReport = {
  kpis: { reports: number; autoHides: number; resolved: number; pending: number; falsePositiveRate: number | null; distinctReporters: number };
  repeatOffenders: { targetId: string; targetType: string; title: string; reports: number; lastAt: Date | null }[];
  recentDecisions: { targetId: string; targetType: string; title: string; action: string; by: string | null; at: Date | null }[];
};

export async function reportModeration(w: ReportWindow): Promise<ModerationReport> {
  const since = sinceFor(w);
  const reports = await pull("content_reports", "all");

  const inWin = reports.filter((r) => inW(dt(r.createdAt), since));
  const autoHides = inWin.filter((r) => r.hidden === true).length;
  const resolved = inWin.filter((r) => r.resolved === true).length;
  const pending = reports.filter((r) => !r.resolved).length;

  const byTarget = new Map<string, { targetType: string; title: string; reports: number; lastAt: Date | null; restored: boolean }>();
  for (const r of reports) {
    const rec = byTarget.get(r.targetId) ?? { targetType: r.targetType, title: r.snapshotTitle ?? r.targetId, reports: 0, lastAt: null, restored: false };
    rec.reports++;
    const at = dt(r.createdAt);
    if (at && (!rec.lastAt || at > rec.lastAt)) rec.lastAt = at;
    if (r.resolved && r.hidden !== true) rec.restored = true;
    byTarget.set(r.targetId, rec);
  }
  // Restores ÷ tripwire hides = false-positive rate (approximation: restored
  // targets that had been auto-hidden).
  const restoredTargets = [...byTarget.values()].filter((r) => r.restored).length;
  const fp = autoHides > 0 ? restoredTargets / Math.max(1, reports.filter((r) => r.hidden === true).length) : null;

  return {
    kpis: {
      reports: inWin.length,
      autoHides,
      resolved,
      pending,
      falsePositiveRate: fp,
      distinctReporters: new Set(inWin.map((r) => r.reporterUid)).size,
    },
    repeatOffenders: [...byTarget.entries()]
      .filter(([, v]) => v.reports >= 3)
      .sort((a, b) => b[1].reports - a[1].reports)
      .slice(0, 10)
      .map(([targetId, v]) => ({ targetId, targetType: v.targetType, title: v.title, reports: v.reports, lastAt: v.lastAt })),
    recentDecisions: inWin
      .filter((r) => r.resolved)
      .sort((a, b) => (dt(b.createdAt)?.getTime() ?? 0) - (dt(a.createdAt)?.getTime() ?? 0))
      .slice(0, 12)
      .map((r) => ({ targetId: r.targetId, targetType: r.targetType, title: r.snapshotTitle ?? r.targetId, action: r.hidden === true ? "kept hidden / removed" : "restored or dismissed", by: r.resolvedBy ?? null, at: dt(r.createdAt) })),
  };
}

// ---------------------------------------------------------------------------
// 4 · Revenue / financials
// ---------------------------------------------------------------------------

export type FinancialsReport = {
  kpis: { topupPeso: number; topupCount: number; feeRevenue: number; freeAccepts: number; floatLiability: number; pendingCount: number; pendingPeso: number; payingProviders: number; providerCount: number };
  monthly: { month: string; topups: number; fees: number; activeProviders: number }[];
  drift: { checked: number; mismatches: number } | null;
};

export async function reportFinancials(w: ReportWindow): Promise<FinancialsReport> {
  const since = sinceFor(w);
  const [events, profilesSnap, pendingSnap] = await Promise.all([
    pull("wallet_events", "all"),
    getAdminDb().collection("profiles").select("role", "credits", "uid").limit(1000).get(),
    getAdminDb().collection("topup_requests").where("status", "==", "pending").get(),
  ]);

  const inWin = events.filter((e) => inW(dt(e.createdAt), since));
  const topups = inWin.filter((e) => e.type === "topup");
  const fees = inWin.filter((e) => e.type === "accept_fee");
  const freeAccepts = inWin.filter((e) => e.type === "free_accept").length;

  const providers = profilesSnap.docs.map((d) => d.data()).filter((p) => p.role === "provider");
  const float = providers.reduce((s, p) => s + (Number(p.credits) || 0), 0);

  const payingEver = new Set(events.filter((e) => e.type === "accept_fee").map((e) => e.uid));

  // Monthly table (last 6 months, from all-time events)
  const monthly = new Map<string, { topups: number; fees: number; providers: Set<string> }>();
  for (const e of events) {
    const at = dt(e.createdAt);
    if (!at) continue;
    const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
    const rec = monthly.get(key) ?? { topups: 0, fees: 0, providers: new Set<string>() };
    if (e.type === "topup") rec.topups += Number(e.amount) || 0;
    if (e.type === "accept_fee") rec.fees += Math.abs(Number(e.amount)) || 0;
    if (e.type !== "free_accept") rec.providers.add(e.uid);
    monthly.set(key, rec);
  }

  // Drift check: latest event balanceAfter per uid vs profile.credits
  const latest = new Map<string, { bal: number; at: number }>();
  for (const e of events) {
    const at = dt(e.createdAt)?.getTime() ?? 0;
    const cur = latest.get(e.uid);
    if (!cur || at >= cur.at) latest.set(e.uid, { bal: Number(e.balanceAfter) || 0, at });
  }
  let mismatches = 0;
  let checked = 0;
  for (const d of profilesSnap.docs) {
    const p = d.data();
    const l = latest.get(d.id);
    if (!l) continue;
    checked++;
    if (l.bal !== (Number(p.credits) || 0)) mismatches++;
  }

  return {
    kpis: {
      topupPeso: topups.reduce((s, e) => s + (Number(e.amount) || 0), 0),
      topupCount: topups.length,
      feeRevenue: fees.reduce((s, e) => s + Math.abs(Number(e.amount)) || 0, 0),
      freeAccepts,
      floatLiability: float,
      pendingCount: pendingSnap.size,
      pendingPeso: pendingSnap.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0),
      payingProviders: payingEver.size,
      providerCount: providers.length,
    },
    monthly: [...monthly.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6).map(([month, v]) => ({ month, topups: v.topups, fees: v.fees, activeProviders: v.providers.size })),
    drift: checked > 0 ? { checked, mismatches } : null,
  };
}

// ---------------------------------------------------------------------------
// 5 · Provider performance (delivery vs spend)
// ---------------------------------------------------------------------------

export type ProviderRow = {
  uid: string;
  name: string;
  tier: string;
  verified: boolean;
  received: number;
  accepted: number;
  declined: number;
  cancelled: number;
  completed: number;
  acceptRate: number | null;
  completionRate: number | null;
  medianResponseHrs: number | null;
  medianFulfillmentHrs: number | null;
  vouches: number;
  vouchesInWindow: number;
  vouchRate: number | null;
  offersMade: number;
  offersSelected: number;
  topupPeso: number;
  feesPaidPeso: number;
  credits: number;
  everPaid: boolean;
  deliveryPerPeso: number | null;
  activity: "green" | "yellow" | "red";
};

export async function reportProviders(w: ReportWindow): Promise<ProviderRow[]> {
  const since = sinceFor(w);
  const [profilesSnap, bookings, offers, events, vouches] = await Promise.all([
    getAdminDb().collection("profiles").where("role", "==", "provider").limit(500).get(),
    pull("bookings", "all"),
    pull("job_offers", w),
    pull("wallet_events", "all"),
    pull("vouch_records", w),
  ]);

  const rows: ProviderRow[] = [];
  for (const d of profilesSnap.docs) {
    const p = d.data();
    const uid = d.id;
    const myBookings = bookings.filter((b) => b.providerUid === uid);
    const inWin = myBookings.filter((b) => inW(dt(b.createdAt), since));
    const received = inWin.length;
    const accepted = inWin.filter((b) => b.status === "accepted" || b.status === "completed").length;
    const declined = inWin.filter((b) => b.status === "declined").length;
    const cancelled = inWin.filter((b) => b.status === "cancelled").length;
    const completed = inWin.filter((b) => b.status === "completed").length;
    const decided = accepted + declined;
    const responseHrs = inWin
      .filter((b) => b.decidedAt && b.createdAt)
      .map((b) => (dt(b.decidedAt)!.getTime() - dt(b.createdAt)!.getTime()) / 3600000);
    const fulfillHrs = inWin
      .filter((b) => b.completedAt && b.createdAt)
      .map((b) => (dt(b.completedAt)!.getTime() - dt(b.createdAt)!.getTime()) / 3600000);

    const completedAll = myBookings.filter((b) => b.status === "completed").length;
    const vouchesTotal = Number(p.vouches) || 0;
    const vouchesInW = vouches.filter((v) => v.providerUid === uid).length;

    const myOffers = offers.filter((o) => o.providerUid === uid);

    const myEvents = events.filter((e) => e.uid === uid);
    const topupPeso = myEvents.filter((e) => e.type === "topup").reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const feesPaid = myEvents.filter((e) => e.type === "accept_fee").reduce((s, e) => s + Math.abs(Number(e.amount)) || 0, 0);
    const everPaid = myEvents.some((e) => e.type === "accept_fee");

    const completedCount = Number(p.completedCount) || 0;
    const tier = completedCount >= 25 ? "Suki" : completedCount >= 10 ? "Trusted" : completedCount >= 3 ? "Rising" : "New";

    rows.push({
      uid,
      name: p.fullName ?? p.email ?? uid,
      tier,
      verified: p.verificationStatus === "approved",
      received,
      accepted,
      declined,
      cancelled,
      completed,
      acceptRate: decided > 0 ? accepted / decided : null,
      completionRate: accepted > 0 ? completed / accepted : null,
      medianResponseHrs: median(responseHrs),
      medianFulfillmentHrs: median(fulfillHrs),
      vouches: vouchesTotal,
      vouchesInWindow: vouchesInW,
      vouchRate: completedAll > 0 ? vouchesTotal / completedAll : null,
      offersMade: myOffers.length,
      offersSelected: myOffers.filter((o) => o.status === "selected" || o.status === "accepted").length,
      topupPeso,
      feesPaidPeso: feesPaid,
      credits: Number(p.credits) || 0,
      everPaid,
      deliveryPerPeso: topupPeso > 0 ? (completedAll / topupPeso) * 1000 : null,
      activity: received > 0 ? "green" : topupPeso > 0 && completedAll === 0 ? "red" : "yellow",
    });
  }
  return rows.sort((a, b) => b.completed - a.completed || b.vouches - a.vouches);
}

// ---------------------------------------------------------------------------
// 6 · Users & activity
// ---------------------------------------------------------------------------

export type UsersReport = {
  kpis: { total: number; providers: number; seekers: number; newInWindow: number; verifiedProviders: number; providerVerifyRate: number | null };
  signupDays: { date: string; n: number }[];
  trustLadder: { tier: string; n: number }[];
};

export async function reportUsers(w: ReportWindow): Promise<UsersReport> {
  const since = sinceFor(w);
  const snap = await getAdminDb().collection("profiles").select("role", "createdAt", "completedCount", "verificationStatus").limit(1000).get();
  const all = snap.docs.map((d) => d.data());
  const providers = all.filter((p) => p.role === "provider");
  const verified = providers.filter((p) => p.verificationStatus === "approved").length;

  const byDay = new Map<string, number>();
  for (const p of all) {
    const at = dt(p.createdAt);
    if (!at || !inW(at, since)) continue;
    const key = at.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const ladder = (min: number, max: number) => providers.filter((p) => {
    const c = Number(p.completedCount) || 0;
    return c >= min && c < max;
  }).length;

  return {
    kpis: {
      total: snap.size,
      providers: providers.length,
      seekers: all.filter((p) => p.role === "seeker").length,
      newInWindow: all.filter((p) => inW(dt(p.createdAt), since)).length,
      verifiedProviders: verified,
      providerVerifyRate: providers.length > 0 ? verified / providers.length : null,
    },
    signupDays: [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-30).map(([date, n]) => ({ date, n })),
    trustLadder: [
      { tier: "New", n: ladder(0, 3) },
      { tier: "Rising", n: ladder(3, 10) },
      { tier: "Trusted", n: ladder(10, 25) },
      { tier: "Suki", n: ladder(25, Infinity) },
    ],
  };
}

// ---------------------------------------------------------------------------
// 7 · Storage & housekeeping
// ---------------------------------------------------------------------------

export type CollectionStat = { name: string; docs: number; estBytes: number };
export type CleanupClass = "read_notifications" | "expired_ads" | "stale_tokens";
export type StorageReport = {
  collections: CollectionStat[];
  cleanup: { key: CleanupClass; label: string; rule: string; count: number; estBytes: number }[];
};

const REPORTED_COLLECTIONS = [
  "profiles", "services", "job_posts", "job_offers", "bookings", "job_ads", "job_ad_interests",
  "vouch_records", "content_reports", "notifications", "wallet_events", "topup_requests",
  "verification_requests", "audit_log", "push_tokens",
];

async function countOf(col: string, ...filters: [string, FirebaseFirestore.WhereFilterOp, unknown][]) {
  let q: FirebaseFirestore.Query = getAdminDb().collection(col);
  for (const [field, op, value] of filters) {
    q = q.where(field, op, value as never);
  }
  const agg = await q.count().get();
  return agg.data().count;
}

function estDocBytes(obj: unknown): number {
  return Buffer.byteLength(JSON.stringify(obj ?? {}), "utf8") + 80; // overhead fudge
}

export async function reportStorage(): Promise<StorageReport> {
  const db = getAdminDb();
  const collections: CollectionStat[] = [];
  for (const name of REPORTED_COLLECTIONS) {
    const docs = await countOf(name);
    let estBytes = 0;
    if (docs > 0) {
      const sample = await db.collection(name).limit(8).get();
      const avg = sample.docs.reduce((s, d) => s + estDocBytes(d.data()), 0) / Math.max(1, sample.size);
      estBytes = Math.round(avg * docs);
    }
    collections.push({ name, docs, estBytes });
  }

  const cutoff90 = Timestamp.fromDate(new Date(Date.now() - 90 * 86400000));
  const cutoff44 = Timestamp.fromDate(new Date(Date.now() - 44 * 86400000));

  // Composite (equality + range) filters would need indexes we don't ship,
  // so: range query on the single indexed field, cap it, filter in memory.
  // Counts are exact up to the 1000-doc cap — labeled as such in the UI.
  const [readNotifs, deadAds, staleTokens] = await Promise.all([
    db.collection("notifications").where("createdAt", "<", cutoff90).limit(1000).get(),
    db.collection("job_ads").where("createdAt", "<", cutoff44).limit(1000).get(),
    db.collection("push_tokens").where("updatedAt", "<", cutoff90).limit(1000).get(),
  ]);
  const readNotifsN = readNotifs.docs.filter((d) => d.data().read === true).length;
  const deadAdsN = deadAds.docs.filter((d) => d.data().status === "open").length;
  const staleTokensN = staleTokens.size;

  const estFor = (col: string, n: number) => {
    const c = collections.find((x) => x.name === col);
    return c && c.docs > 0 ? Math.round((c.estBytes / c.docs) * n) : 0;
  };

  return {
    collections: collections.sort((a, b) => b.estBytes - a.estBytes),
    cleanup: [
      { key: "read_notifications", label: "Read notifications", rule: "read & older than 90 days", count: readNotifsN, estBytes: estFor("notifications", readNotifsN) },
      { key: "expired_ads", label: "Dead job ads", rule: "still 'open' but older than 44 days (30d TTL + 14d grace)", count: deadAdsN, estBytes: estFor("job_ads", deadAdsN) },
      { key: "stale_tokens", label: "Stale push tokens", rule: "not refreshed in 90 days", count: staleTokensN, estBytes: estFor("push_tokens", staleTokensN) },
    ],
  };
}

export async function runCleanup(kind: CleanupClass, cap = 400): Promise<number> {
  const db = getAdminDb();
  const cutoff90 = Timestamp.fromDate(new Date(Date.now() - 90 * 86400000));
  const cutoff44 = Timestamp.fromDate(new Date(Date.now() - 44 * 86400000));

  // Range query on the single indexed field, then filter in memory (see
  // reportStorage note about composite indexes).
  let targets: FirebaseFirestore.QueryDocumentSnapshot[];
  if (kind === "read_notifications") {
    const snap = await db.collection("notifications").where("createdAt", "<", cutoff90).limit(1000).get();
    targets = snap.docs.filter((d) => d.data().read === true);
  } else if (kind === "expired_ads") {
    const snap = await db.collection("job_ads").where("createdAt", "<", cutoff44).limit(1000).get();
    targets = snap.docs.filter((d) => d.data().status === "open");
  } else {
    const snap = await db.collection("push_tokens").where("updatedAt", "<", cutoff90).limit(cap).get();
    targets = snap.docs;
  }

  const toDelete = targets.slice(0, cap);
  if (toDelete.length === 0) return 0;

  const batch = db.batch();
  for (const d of toDelete) batch.delete(d.ref);
  await batch.commit();
  await db.collection("audit_log").add({
    actorUid: "system",
    action: `reports.clean.${kind}`,
    targetUid: null,
    note: `deleted ${toDelete.length} docs`,
    at: FieldValue.serverTimestamp(),
  });
  return toDelete.length;
}

// ---------------------------------------------------------------------------
// Daily snapshot (cron) — cheap counts for sparklines & growth
// ---------------------------------------------------------------------------

export async function writeReportSnapshot(): Promise<void> {
  const db = getAdminDb();
  const day = new Date().toISOString().slice(0, 10);
  const [ads, posts, services, bookings, users, notifs] = await Promise.all([
    countOf("job_ads"),
    countOf("job_posts"),
    countOf("services", ["active", "==", true]),
    countOf("bookings", ["status", "==", "completed"]),
    countOf("profiles"),
    countOf("notifications"),
  ]);
  await db.collection("reports_snapshots").doc(day).set({
    day,
    jobAds: ads,
    posts,
    services,
    completedBookings: bookings,
    users,
    notifications: notifs,
    at: FieldValue.serverTimestamp(),
  });
  // prune > 180 days
  const old = await db.collection("reports_snapshots").where("day", "<", new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)).get();
  for (const d of old.docs) await d.ref.delete();
}

export async function readSnapshots(n = 30): Promise<{ day: string; users: number; posts: number; jobAds: number; completedBookings: number }[]> {
  const snap = await getAdminDb().collection("reports_snapshots").orderBy("day", "desc").limit(n).get();
  return snap.docs
    .map((d) => {
      const v = d.data();
      return { day: String(v.day ?? d.id), users: Number(v.users) || 0, posts: Number(v.posts) || 0, jobAds: Number(v.jobAds) || 0, completedBookings: Number(v.completedBookings) || 0 };
    })
    .reverse();
}

