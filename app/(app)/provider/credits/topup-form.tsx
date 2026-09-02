"use client";

import { useState, type FormEvent } from "react";
import { requestTopUpAction } from "@/app/actions/wallet";
import { isNextRedirect } from "@/lib/client-errors";
import {
  MIN_TOPUP_PESOS,
  MAX_TOPUP_PESOS,
  TOPUP_METHODS,
  TOPUP_METHOD_LABELS,
  formatPeso,
} from "@/lib/catalog";
import type { TopUpMethod } from "@/lib/catalog";

const HOW_TO = [
  "Send your payment to the platform account (GCash / Maya / BPI).",
  "Note the payment reference number.",
  "Submit it here — an admin confirms and credits appear in your balance.",
];

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
    } catch (err) {
      if (isNextRedirect(err)) return;
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cc-card flex flex-col gap-4">
      <div className="text-sm font-semibold">Top up credits</div>

      {error && <p className="cc-error">{error}</p>}

      <div className="flex flex-col gap-2.5 rounded-[16px] p-3.5" style={{ background: "var(--c-surface-2)" }}>
        {HOW_TO.map((line, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span
              className="cc-num flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold"
              style={{ background: "var(--c-accent)", color: "#fff" }}
            >
              {i + 1}
            </span>
            <span className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
              {line}
            </span>
          </div>
        ))}
      </div>

      <div>
        <label className="cc-label" htmlFor="tuAmount">
          Amount ({formatPeso(MIN_TOPUP_PESOS)}–{formatPeso(MAX_TOPUP_PESOS)})
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold"
            style={{ color: "var(--c-text-3)" }}
          >
            ₱
          </span>
          <input
            id="tuAmount"
            type="number"
            inputMode="numeric"
            min={MIN_TOPUP_PESOS}
            max={MAX_TOPUP_PESOS}
            step={1}
            className="cc-input cc-num text-[15px] font-semibold"
            style={{ paddingLeft: 36 }}
            placeholder="300"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <span className="cc-label">Payment method</span>
        <div className="flex gap-2">
          {TOPUP_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              className={`cc-chip ${method === m ? "cc-chip-active" : ""}`}
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
