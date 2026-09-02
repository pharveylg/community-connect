"use client";

import { useState, type FormEvent } from "react";
import { createServiceAction } from "@/app/actions/services";
import {
  LEAD_TIMES,
  LEAD_TIME_LABELS,
  RATE_TYPES,
  RATE_TYPE_LABELS,
  SERVICE_CATEGORIES,
  CUSTOM_CATEGORY,
  type CategorySlug,
  type LeadTime,
  type RateType,
} from "@/lib/catalog";
import type { ServiceListingInput } from "@/lib/validation";

type Step = "service" | "rates" | "area";

const STEP_PROGRESS: Record<Step, number> = { service: 34, rates: 67, area: 100 };

export function AddServiceForm() {
  const [step, setStep] = useState<Step>("service");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Step 1 — the service
  const [categorySlug, setCategorySlug] = useState<CategorySlug | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 — rates
  const [rateAmount, setRateAmount] = useState("");
  const [rateType, setRateType] = useState<RateType>("per_job");
  const [negotiable, setNegotiable] = useState(true);

  // Step 3 — area & availability
  const [city, setCity] = useState("Cagayan de Oro City");
  const [barangay, setBarangay] = useState("");
  const [leadTime, setLeadTime] = useState<LeadTime>("same_day");

  const isCustom = categorySlug === CUSTOM_CATEGORY;
  const category = SERVICE_CATEGORIES.find((c) => c.slug === categorySlug);

  function pickCategory(slug: CategorySlug) {
    setCategorySlug(slug);
    const cat = SERVICE_CATEGORIES.find((c) => c.slug === slug);
    // Prefill the service name with the category label (still editable);
    // custom services always start blank.
    setTitle(slug === CUSTOM_CATEGORY ? "" : (cat?.label ?? ""));
  }

  function handleContinue() {
    setError(null);
    if (!categorySlug) {
      setError("Please choose a category for your service.");
      return;
    }
    if (title.trim().length < 3) {
      setError(
        isCustom
          ? "Give your service a short name (e.g. Trash pickup, Junk & scrap hauling)."
          : "Please give your service a short name."
      );
      return;
    }
    setStep("rates");
  }

  function handleRatesContinue() {
    setError(null);
    const amount = Number(rateAmount);
    if (!rateAmount.trim() || Number.isNaN(amount) || amount < 1) {
      setError("Please enter your rate in whole pesos (e.g. 350).");
      return;
    }
    setStep("area");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categorySlug) {
      setError("Please choose a category for your service.");
      setStep("service");
      return;
    }
    if (barangay.trim().length < 2) {
      setError("Please enter the barangay you serve.");
      return;
    }

    const input: ServiceListingInput = {
      categorySlug,
      title: title.trim(),
      description: description.trim(),
      rateType,
      rateAmount: Number(rateAmount),
      negotiable,
      city: city.trim(),
      barangay: barangay.trim(),
      leadTime,
    };

    setPending(true);
    try {
      const result = await createServiceAction(input);
      if (result?.error) {
        setError(result.error);
        setPending(false);
        return;
      }
      // Success redirects server-side to /provider.
    } catch {
      setError("Something went wrong creating your service. Please try again.");
      setPending(false);
    }
  }

  return (
    <div>
      <div
        className="mb-6 h-1 overflow-hidden rounded-full"
        style={{ background: "var(--c-border)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--c-accent), var(--c-accent-2))",
            width: `${STEP_PROGRESS[step]}%`,
            transitionProperty: "width",
            transitionDuration: "400ms",
            transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
          }}
        />
      </div>

      {error && <p className="cc-error mb-4">{error}</p>}

      {step === "service" && (
        <div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                className="cc-role-card"
                style={{
                  flexDirection: "column",
                  gap: 6,
                  alignItems: "flex-start",
                  minHeight: 84,
                  padding: 12,
                  borderColor:
                    categorySlug === cat.slug ? "var(--c-accent)" : undefined,
                  background:
                    categorySlug === cat.slug ? "var(--c-accent-light)" : undefined,
                }}
                onClick={() => pickCategory(cat.slug)}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-xs font-semibold">{cat.label}</span>
                <span className="text-[11px] leading-snug" style={{ color: "var(--c-text-2)" }}>
                  {cat.blurb}
                </span>
              </button>
            ))}
          </div>

          {categorySlug && (
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className="cc-label" htmlFor="svcTitle">
                  {isCustom ? "What's your service called?" : "Service name"}
                </label>
                <input
                  id="svcTitle"
                  className="cc-input"
                  placeholder={
                    isCustom ? "e.g. Trash pickup / Junk & scrap metal hauling" : "e.g. Leak repairs, tricycle rides"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div>
                <label className="cc-label" htmlFor="svcDesc">
                  Short description (optional)
                </label>
                <textarea
                  id="svcDesc"
                  className="cc-input"
                  style={{ minHeight: 72, paddingTop: 10, paddingBottom: 10 }}
                  placeholder={
                    isCustom
                      ? "e.g. Weekly trash pull-out; buys scrap metal, free hauling of junk items"
                      : "What's included, what you bring, etc."
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className="cc-btn cc-btn-primary mt-4"
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      )}

      {step === "rates" && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="cc-label" htmlFor="svcRate">
              Your rate (₱)
            </label>
            <input
              id="svcRate"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className="cc-input"
              placeholder="e.g. 350"
              value={rateAmount}
              onChange={(e) => setRateAmount(e.target.value)}
            />
          </div>

          <div>
            <span className="cc-label">Rate type</span>
            <div className="flex gap-2">
              {RATE_TYPES.map((rt) => (
                <button
                  key={rt}
                  type="button"
                  className="cc-chip"
                  style={
                    rateType === rt
                      ? { background: "var(--c-accent)", color: "#fff", borderColor: "var(--c-accent)" }
                      : undefined
                  }
                  onClick={() => setRateType(rt)}
                >
                  {RATE_TYPE_LABELS[rt]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={negotiable}
              onChange={(e) => setNegotiable(e.target.checked)}
              className="h-4 w-4"
              style={{ accentColor: "var(--c-accent)" }}
            />
            <span className="text-sm" style={{ color: "var(--c-text-2)" }}>
              Clients can send counter-offers (rate negotiable)
            </span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              className="cc-btn cc-btn-secondary"
              style={{ width: "auto", padding: "0 16px" }}
              onClick={() => setStep("service")}
            >
              Back
            </button>
            <button type="button" className="cc-btn cc-btn-primary" onClick={handleRatesContinue}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "area" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="cc-label" htmlFor="svcCity">
              City / municipality
            </label>
            <input
              id="svcCity"
              className="cc-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <label className="cc-label" htmlFor="svcBrgy">
              Barangay you&apos;re based in
            </label>
            <input
              id="svcBrgy"
              className="cc-input"
              placeholder="e.g. Barangay 28"
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <label className="cc-label" htmlFor="svcLead">
              How much notice do you need?
            </label>
            <select
              id="svcLead"
              className="cc-input"
              value={leadTime}
              onChange={(e) => setLeadTime(e.target.value as LeadTime)}
            >
              {LEAD_TIMES.map((lt) => (
                <option key={lt} value={lt}>
                  {LEAD_TIME_LABELS[lt]}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl p-3 text-xs leading-relaxed" style={{ background: "var(--c-surface-2)", color: "var(--c-text-2)" }}>
            Review: <strong>{title || "Your service"}</strong>
            {category ? ` · ${category.label}` : ""} · ₱{rateAmount || "—"}{" "}
            {RATE_TYPE_LABELS[rateType]}
            {negotiable ? " · negotiable" : " · fixed"}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="cc-btn cc-btn-secondary"
              style={{ width: "auto", padding: "0 16px" }}
              disabled={pending}
              onClick={() => setStep("rates")}
            >
              Back
            </button>
            <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
              {pending ? "Publishing…" : "Publish service"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
