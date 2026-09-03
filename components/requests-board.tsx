"use client";

import { useState } from "react";
import Link from "next/link";

// Public requests board (root page). Anyone can browse; tapping Respond
// reveals the sign-up / log-in gate — the root is anonymous-only, so every
// respondent is gated. After auth they land on /provider/jobs to quote.

export type RequestRow = {
  id: string;
  title: string;
  category: string;
  barangay: string;
  budget: string;
  when: string;
  needsPro: boolean;
};

const NEXT = encodeURIComponent("/provider/jobs");

const smallBtn = { width: "auto", minHeight: 36, padding: "0 14px", fontSize: 12.5 } as const;

export function RequestsBoard({ requests }: { requests: RequestRow[] }) {
  const [picked, setPicked] = useState<RequestRow | null>(null);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-[10px] px-2.5 py-2"
            style={{ background: "var(--c-surface)", boxShadow: "var(--shadow-border)" }}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{r.title}</div>
              <div className="text-[11px]" style={{ color: "var(--c-text-3)" }}>
                {r.category} · 📍 {r.barangay} · {r.when}
                {r.needsPro ? " · ✅ licensed pro" : ""}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="cc-num text-[11.5px] font-semibold">{r.budget}</span>
              <button
                type="button"
                onClick={() => setPicked(r)}
                className="text-xs font-semibold"
                style={{ color: "var(--c-accent)" }}
              >
                Respond →
              </button>
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <p className="text-xs" style={{ color: "var(--c-text-2)" }}>
            No open requests right now — check back soon.
          </p>
        )}
      </div>

      {picked && (
        <div className="mt-2.5 rounded-[12px] p-3" style={{ background: "var(--c-accent-light)" }}>
          <div className="text-[13px] font-semibold">Respond to “{picked.title}”</div>
          <p className="mb-2.5 mt-0.5 text-[11.5px] leading-relaxed" style={{ color: "var(--c-text-2)" }}>
            Create a free provider account to quote on requests. Quoting is free — you only pay
            ₱20 per accepted job beyond your 5 free each month.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/register?next=${NEXT}`} className="cc-btn cc-btn-primary" style={smallBtn}>
              Sign up — it&apos;s free
            </Link>
            <Link href={`/login?next=${NEXT}`} className="cc-btn cc-btn-secondary" style={smallBtn}>
              I already have an account
            </Link>
            <button type="button" onClick={() => setPicked(null)} className="cc-btn cc-btn-ghost" style={smallBtn}>
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
