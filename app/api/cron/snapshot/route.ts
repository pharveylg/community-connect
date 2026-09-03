import { NextRequest, NextResponse } from "next/server";
import { writeReportSnapshot } from "@/lib/reports";

// Daily KPI snapshot for report sparklines (00:10 UTC — right after the
// digest cron). Auth: Vercel's automatic header, or Bearer CRON_SECRET.
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  const authorized = isVercelCron || (Boolean(secret) && bearer === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await writeReportSnapshot();
  return NextResponse.json({ ok: true });
}
