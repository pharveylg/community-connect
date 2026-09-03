"use client";

import { useState } from "react";
import Link from "next/link";

// Root-page CTA: "Don't see the service? Post a request." The root is
// anonymous-only (logged-in users redirect to their home), so attempting
// to post reveals the sign-up / log-in prompt with ?next= straight into
// the request form.

const NEXT = encodeURIComponent("/seeker/requests/new");

export function PostRequestCta() {
  const [open, setOpen] = useState(false);

  return (
    <div className="cc-card mb-10 p-5 text-center">
      <div className="mb-1 text-sm font-semibold">Don&apos;t see the service?</div>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
        Post what you need and let local providers come to you with offers.
        Seeking is free — forever.
      </p>
      {open ? (
        <div className="mx-auto flex max-w-xs flex-col gap-2">
          <Link href={`/register?next=${NEXT}`} className="cc-btn cc-btn-primary">
            Sign up — it&apos;s free
          </Link>
          <Link href={`/login?next=${NEXT}`} className="cc-btn cc-btn-secondary">
            I already have an account
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cc-btn cc-btn-primary"
          style={{ width: "auto", minHeight: 38, padding: "0 18px", fontSize: 13 }}
        >
          Post a request →
        </button>
      )}
    </div>
  );
}
