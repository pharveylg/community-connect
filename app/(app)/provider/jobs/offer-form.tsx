"use client";

import { useState, type FormEvent } from "react";
import { makeOfferAction } from "@/app/actions/jobboard";
import { isNextRedirect } from "@/lib/client-errors";

export function OfferForm({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await makeOfferAction(postId, { amount: Number(amount), message });
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

  if (!open) {
    return (
      <button
        type="button"
        className="cc-btn cc-btn-primary"
        style={{ width: "auto", minHeight: 38, fontSize: 13, padding: "0 16px" }}
        onClick={() => setOpen(true)}
      >
        Make an offer
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      {error && <p className="cc-error">{error}</p>}
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold"
          style={{ color: "var(--c-text-3)" }}
        >
          ₱
        </span>
        <input
          aria-label="Your price"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          className="cc-input cc-num text-[15px] font-semibold"
          style={{ paddingLeft: 36 }}
          placeholder="Your price"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <textarea
        aria-label="Message to the seeker"
        className="cc-input"
        style={{ minHeight: 60, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
        placeholder="Short message — when you can come, what you bring…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={300}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="cc-btn cc-btn-ghost"
          style={{ width: "auto", padding: "0 14px" }}
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button type="submit" className="cc-btn cc-btn-primary" style={{ flex: 1 }} disabled={pending}>
          {pending ? "Sending…" : "Send offer"}
        </button>
      </div>
    </form>
  );
}
