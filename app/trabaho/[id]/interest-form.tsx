"use client";

import { useState, type FormEvent } from "react";
import { expressInterestAction } from "@/app/actions/trabaho";
import { isNextRedirect } from "@/lib/client-errors";

export function InterestForm({ adId }: { adId: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await expressInterestAction(adId, { message });
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
    } catch (err) {
      if (isNextRedirect(err)) return;
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cc-card flex flex-col gap-3">
      <div className="text-sm font-semibold">I&apos;m interested</div>
      {error && <p className="cc-error">{error}</p>}
      <textarea
        aria-label="Short message to the employer"
        className="cc-input"
        style={{ minHeight: 72, paddingTop: 10, paddingBottom: 10 }}
        placeholder="Short message — your experience, when you can start…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={300}
      />
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--c-text-3)" }}>
        The employer will see your name and Community Connect profile. Your
        mobile number is shared only if they shortlist you.
      </p>
      <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Express interest — free"}
      </button>
    </form>
  );
}
