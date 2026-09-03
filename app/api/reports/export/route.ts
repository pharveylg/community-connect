import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import {
  reportJobAds,
  reportCategories,
  reportModeration,
  reportFinancials,
  reportProviders,
  reportUsers,
  reportStorage,
  type ReportWindow,
} from "@/lib/reports";

// CSV export for the admin Reports tab. Admin session required.
// UTF-8 BOM so Excel renders ₱ correctly.

const WIN: ReportWindow[] = ["7d", "30d", "all"];

function csv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

const pct = (x: number | null | undefined) => (x === null || x === undefined ? "" : `${Math.round(x * 100)}%`);

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const section = req.nextUrl.searchParams.get("section") ?? "";
  const wParam = req.nextUrl.searchParams.get("window") ?? "30d";
  const w: ReportWindow = WIN.includes(wParam as ReportWindow) ? (wParam as ReportWindow) : "30d";

  let out: string;
  switch (section) {
    case "ads": {
      const r = await reportJobAds(w);
      out = csv(
        ["Ad", "Poster", "Posted", "Status", "Interests", "Shortlisted", "Days to shortlist"],
        r.rows.map((x) => [x.title, x.poster, x.postedAt?.toISOString().slice(0, 10) ?? "", x.status, x.interests, x.shortlisted, x.daysToShortlist?.toFixed(1) ?? ""])
      );
      break;
    }
    case "categories": {
      const r = await reportCategories(w);
      out = csv(
        ["Category", "Active services", "Providers", "Median ₱/hr", "Median ₱/day", "Seeker posts", "Offers", "Offer→accept", "Bookings", "Completion", "Posts per provider"],
        r.rows.map((x) => [x.label, x.servicesActive, x.providers, x.medianHourly ?? "", x.medianDaily ?? "", x.seekerPosts, x.offers, pct(x.offerAcceptRate), x.bookings, pct(x.completionRate), x.demandPerProvider?.toFixed(1) ?? ""])
      );
      break;
    }
    case "moderation": {
      const r = await reportModeration(w);
      out = csv(
        ["Target", "Type", "Reports", "Last report"],
        r.repeatOffenders.map((x) => [x.title, x.targetType, x.reports, x.lastAt?.toISOString().slice(0, 10) ?? ""])
      );
      break;
    }
    case "financials": {
      const r = await reportFinancials(w);
      out = csv(
        ["Month", "Top-ups ₱", "Accept fees ₱", "Active providers (paid events)"],
        r.monthly.map((m) => [m.month, m.topups, m.fees, m.activeProviders])
      );
      break;
    }
    case "providers": {
      const r = await reportProviders(w);
      out = csv(
        ["Provider", "Tier", "Verified", "Bookings received", "Accepted", "Declined", "Cancelled", "Completed", "Accept rate", "Median response (h)", "Median fulfillment (h)", "Vouches", "Vouch rate", "Offers made", "Selected", "Top-ups ₱", "Fees paid ₱", "Credits held", "Delivery per ₱1k", "Activity"],
        r.map((p) => [
          p.name, p.tier, p.verified ? "yes" : "no", p.received, p.accepted, p.declined, p.cancelled, p.completed,
          pct(p.acceptRate), p.medianResponseHrs?.toFixed(1) ?? "", p.medianFulfillmentHrs?.toFixed(1) ?? "",
          p.vouches, pct(p.vouchRate), p.offersMade, p.offersSelected, p.topupPeso, p.feesPaidPeso, p.credits,
          p.deliveryPerPeso?.toFixed(2) ?? "", p.activity,
        ])
      );
      break;
    }
    case "users": {
      const r = await reportUsers(w);
      out = csv(
        ["Day", "New signups"],
        r.signupDays.map((d) => [d.date, d.n])
      );
      break;
    }
    case "storage": {
      const r = await reportStorage();
      out = csv(
        ["Collection", "Docs", "Est. bytes"],
        r.collections.map((c) => [c.name, c.docs, c.estBytes])
      );
      break;
    }
    default:
      return NextResponse.json({ error: "unknown section" }, { status: 400 });
  }

  return new NextResponse(`\uFEFF${out}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cc_${section}_${new Date().toISOString().slice(0, 10)}_${w}.csv"`,
    },
  });
}
