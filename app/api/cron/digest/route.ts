import { NextRequest, NextResponse } from "next/server";
import { sendDailyDigest } from "@/lib/digest";

// Daily digest cron (see vercel.json — 00:00 UTC = 08:00 PH time).
// Auth: Vercel's automatic x-vercel-cron header, or Bearer CRON_SECRET.
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  const authorized = isVercelCron || (Boolean(secret) && bearer === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sendDailyDigest();
  return NextResponse.json({ ok: true, ...result });
}
