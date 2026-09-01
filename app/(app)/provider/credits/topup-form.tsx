"use client";

import { useState, type FormEvent } from "react";
import { requestTopUpAction } from "@/app/actions/wallet";
import {
  MIN_TOPUP_PESOS,
  MAX_TOPUP_PESOS,
  TOPUP_METHODS,
  TOPUP_METHOD_LABELS,
  formatPeso,
} from "@/lib/catalog";
import type { TopUpMethod } from "@/lib/catalog";

export function TopUpForm() {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TopUpMethod>("gcash");
  const [refNumber, setRefNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await requestTopUpAction({
        amount: Number(amount),
        method,
        refNumber,
      });
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
      // Success redirects server-side.
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cc-card flex flex-col gap-4">
      <div className="text-sm font-semibold">Top up credits</div>

      {error && <p className="cc-error">{error}</p>}

      <div className="rounded-2xl p-3 text-xs leading-relaxed" style={{ background: "var(--c-surface-2)", color: "var(--c-text-2)" }}>
        1. Send your payment to the platform account (GCash 09XX-XXX-XXXX /
        Maya / BPI) · 2. Note your reference number · 3. Submit it here — an
        admin confirms and credits appear in your balance.
      </div>

      <div>
        <label className="cc-label" htmlFor="tuAmount">
          Amount ({formatPeso(MIN_TOPUP_PESOS)}–{formatPeso(MAX_TOPUP_PESOS)})
        </label>
        <input
          id="tuAmount"
          type="number"
          inputMode="numeric"
          min={MIN_TOPUP_PESOS}
          max={MAX_TOPUP_PESOS}
          step={1}
          className="cc-input"
          placeholder="e.g. 300"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <span className="cc-label">Payment method</span>
        <div className="flex gap-2">
          {TOPUP_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              className="cc-chip"
              style={
                method === m
                  ? { background: "var(--c-accent)", color: "#fff", borderColor: "var(--c-accent)" }
                  : undefined
              }
              onClick={() => setMethod(m)}
            >
              {TOPUP_METHOD_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="cc-label" htmlFor="tuRef">
          Payment reference number
        </label>
        <input
          id="tuRef"
          className="cc-input"
          placeholder="e.g. GCash ref 0301 2345"
          value={refNumber}
          onChange={(e) => setRefNumber(e.target.value)}
          maxLength={60}
          required
        />
      </div>

      <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
        {pending ? "Submitting…" : "Submit top-up request"}
      </button>
    </form>
  );
}
