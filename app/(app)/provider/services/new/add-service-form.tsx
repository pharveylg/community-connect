"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { createServiceAction } from "@/app/actions/services";
import { isNextRedirect } from "@/lib/client-errors";
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
const STEP_LABEL: Record<Step, string> = {
  service: "Step 1 of 3 · The service",
  rates: "Step 2 of 3 · Your rate",
  area: "Step 3 of 3 · Area & availability",
};

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
    } catch (err) {
      if (isNextRedirect(err)) return;
      setError("Something went wrong creating your service. Please try again.");
      setPending(false);
    }
  }

  return (
    <div>
      <div
        className="mb-2 h-1 overflow-hidden rounded-full"
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
      <div
        className="mb-5 text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--c-text-3)" }}
      >
        {STEP_LABEL[step]}
      </div>

      {error && <p className="cc-error mb-4">{error}</p>}

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
      >
        {step === "service" && (
          <div>
            <h2 className="mb-1 text-[20px] font-semibold tracking-tight">
              What do you offer?
            </h2>
            <p className="mb-4 text-[13px]" style={{ color: "var(--c-text-2)" }}>
              Pick a category — or name your own.
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {SERVICE_CATEGORIES.map((cat) => {
                const selected = categorySlug === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    className="relative rounded-[16px] p-3 text-left"
                    style={{
                      background: selected ? "var(--c-accent-light)" : "var(--c-surface)",
                      boxShadow: selected
                        ? "0 0 0 2px var(--c-accent), var(--shadow-border)"
                        : "var(--shadow-border)",
                      transitionProperty: "box-shadow, transform",
                      transitionDuration: "160ms",
                    }}
                    onClick={() => pickCategory(cat.slug)}
                  >
                    {selected && (
                      <span
                        className="cc-badge absolute right-2 top-2"
                        style={{ background: "var(--c-accent)", color: "#fff" }}
                      >
                        ✓
                      </span>
                    )}
                    <div className="mb-1.5 text-xl">{cat.emoji}</div>
                    <div className="mb-0.5 text-[12.5px] font-semibold leading-tight">
                      {cat.label}
                    </div>
                    <div className="text-[11px] leading-snug" style={{ color: "var(--c-text-2)" }}>
                      {cat.blurb}
                    </div>
                  </button>
                );
              })}
            </div>

            {categorySlug && (
              <div className="cc-card flex flex-col gap-4">
                <div>
                  <label className="cc-label" htmlFor="svcTitle">
                    {isCustom ? "What's your service called?" : "Service name"}
                  </label>
                  <input
                    id="svcTitle"
                    className="cc-input"
                    placeholder={
                      isCustom
                        ? "e.g. Trash pickup / Junk & scrap metal hauling"
                        : "e.g. Leak repairs, tricycle rides"
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

            <button type="button" className="cc-btn cc-btn-primary mt-4" onClick={handleContinue}>
              Continue
            </button>
          </div>
        )}

        {step === "rates" && (
          <div className="flex flex-col gap-4">
            <h2 className="mb-0 text-[20px] font-semibold tracking-tight">Your rate</h2>

            <div className="cc-card flex flex-col gap-4">
              <div>
                <label className="cc-label" htmlFor="svcRate">
                  Rate (pesos)
                </label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold"
                    style={{ color: "var(--c-text-3)" }}
                  >
                    ₱
                  </span>
                  <input
                    id="svcRate"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    className="cc-input cc-num text-[15px] font-semibold"
                    style={{ paddingLeft: 36 }}
                    placeholder="350"
                    value={rateAmount}
                    onChange={(e) => setRateAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <span className="cc-label">Rate type</span>
                <div className="flex gap-2">
                  {RATE_TYPES.map((rt) => (
                    <button
                      key={rt}
                      type="button"
                      className={`cc-chip ${rateType === rt ? "cc-chip-active" : ""}`}
                      onClick={() => setRateType(rt)}
                    >
                      {RATE_TYPE_LABELS[rt]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNegotiable(!negotiable)}
              className="cc-card flex items-center justify-between text-left"
              style={{ cursor: "pointer" }}
            >
              <span>
                <span className="mb-0.5 block text-sm font-semibold">
                  Rate negotiable
                </span>
                <span className="block text-xs" style={{ color: "var(--c-text-2)" }}>
                  Clients can send counter-offers
                </span>
              </span>
              <span
                className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full"
                style={{
                  background: negotiable
                    ? "linear-gradient(135deg, var(--c-accent), var(--c-accent-2))"
                    : "var(--c-surface-2)",
                  boxShadow: "var(--shadow-border)",
                  transitionProperty: "background",
                  transitionDuration: "200ms",
                }}
              >
                <span
                  className="absolute h-5 w-5 rounded-full bg-white"
                  style={{
                    left: negotiable ? 26 : 4,
                    boxShadow: "0 1px 3px rgba(0,0,0,.25)",
                    transitionProperty: "left",
                    transitionDuration: "200ms",
                    transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
                  }}
                />
              </span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                className="cc-btn cc-btn-ghost"
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
            <h2 className="mb-0 text-[20px] font-semibold tracking-tight">
              Where &amp; when
            </h2>

            <div className="cc-card flex flex-col gap-4">
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
            </div>

            <div
              className="rounded-[16px] p-4"
              style={{ background: "var(--c-accent-light)" }}
            >
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--c-accent)" }}>
                Review
              </div>
              <div className="text-[15px] font-semibold">{title || "Your service"}</div>
              <div className="mt-0.5 text-xs cc-num" style={{ color: "var(--c-text-2)" }}>
                {category?.label} · ₱{rateAmount || "—"} {RATE_TYPE_LABELS[rateType]}
                {negotiable ? " · negotiable" : " · fixed"} · {barangay || "your barangay"},{" "}
                {city}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="cc-btn cc-btn-ghost"
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
      </motion.div>
    </div>
  );
}
