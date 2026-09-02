"use client";

import { useState, type FormEvent } from "react";
import { createBookingAction } from "@/app/actions/bookings";
import { isNextRedirect } from "@/lib/client-errors";

export function RequestBookingForm({
  serviceId,
  rate,
  providerVerified,
}: {
  serviceId: string;
  rate: string;
  providerVerified: boolean;
}) {
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await createBookingAction(serviceId, {
        preferredDate,
        preferredTime,
        message,
      });
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
      // Success redirects server-side.
    } catch (err) {
      if (isNextRedirect(err)) return;
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cc-card flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[14px] text-xl"
          style={{ background: "var(--c-accent-light)" }}
        >
          📅
        </div>
        <div>
          <div className="text-sm font-semibold">Request a booking</div>
          <div className="text-xs cc-num" style={{ color: "var(--c-text-2)" }}>
            {rate} — no payment in-app
          </div>
        </div>
      </div>

      {error && <p className="cc-error">{error}</p>}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="cc-label" htmlFor="bkDate">
            Preferred date
          </label>
          <input
            id="bkDate"
            type="date"
            className="cc-input"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <label className="cc-label" htmlFor="bkTime">
            Time (optional)
          </label>
          <input
            id="bkTime"
            type="time"
            className="cc-input"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="cc-label" htmlFor="bkMsg">
          Message to the provider (optional)
        </label>
        <textarea
          id="bkMsg"
          className="cc-input"
          style={{ minHeight: 72, paddingTop: 10, paddingBottom: 10 }}
          placeholder="e.g. Small leak under the kitchen sink, ground floor"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={300}
        />
      </div>

      {!providerVerified && (
        <div
          className="rounded-[12px] p-3 text-[11.5px] leading-relaxed"
          style={{ background: "var(--c-surface-2)", color: "var(--c-text-2)" }}
        >
          ℹ️ This provider isn&apos;t ID-verified (optional). Check their completed
          jobs and vouches above — proceed only when you&apos;re comfortable.
        </div>
      )}

      <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send booking request"}
      </button>
    </form>
  );
}
