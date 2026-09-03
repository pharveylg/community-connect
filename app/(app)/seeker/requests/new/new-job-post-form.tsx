"use client";

import { useState, type FormEvent } from "react";
import { createJobPostAction } from "@/app/actions/jobboard";
import { PRO_SERVICE_CATEGORIES, SERVICE_CATEGORIES, type CategorySlug } from "@/lib/catalog";
import { isNextRedirect } from "@/lib/client-errors";

export function NewJobPostForm({
  defaultCity,
  seekerName,
}: {
  defaultCity: string;
  seekerName: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState<CategorySlug | null>(null);
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [flexible, setFlexible] = useState(true);
  const [whenNeeded, setWhenNeeded] = useState("");
  const [budget, setBudget] = useState("");
  const [needsPro, setNeedsPro] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categorySlug) {
      setError("Please choose a category — ✨ Something else works for anything.");
      return;
    }
    if (!flexible && !whenNeeded) {
      setError("Pick a date, or choose Flexible.");
      return;
    }
    setPending(true);
    try {
      const proCat = PRO_SERVICE_CATEGORIES.some((c) => c.slug === categorySlug);
      const result = await createJobPostAction({
        title,
        description,
        categorySlug,
        needsPro: needsPro || proCat,
        barangay,
        city,
        whenNeeded: flexible ? "flexible" : whenNeeded,
        budget: budget.trim() === "" ? null : Number(budget),
      });
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
    <form onSubmit={handleSubmit} className="cc-card flex flex-col gap-4">
      <div className="mb-1 flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[14px] text-xl"
          style={{ background: "var(--c-accent-light)" }}
        >
          🎯
        </div>
        <div>
          <div className="text-sm font-semibold">New request</div>
          <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
            Posting as {seekerName.split(" ")[0]} · offers from ✅ verified providers only
          </div>
        </div>
      </div>

      {error && <p className="cc-error">{error}</p>}

      <div>
        <label className="cc-label" htmlFor="jpTitle">
          What do you need?
        </label>
        <input
          id="jpTitle"
          className="cc-input"
          placeholder="e.g. Aircon cleaning (2 units), haul away scraps…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          required
        />
      </div>

      <div>
        <span className="cc-label">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              className={`cc-chip ${categorySlug === cat.slug ? "cc-chip-active" : ""}`}
              onClick={() => setCategorySlug(cat.slug)}
            >
              <span className="text-sm leading-none">{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="cc-label">
          Licensed pro needed?{" "}
          <span style={{ color: "var(--c-text-3)" }}>— pros launch soon</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRO_SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              className={`cc-chip ${categorySlug === cat.slug ? "cc-chip-active" : ""}`}
              onClick={() => {
                setCategorySlug(cat.slug);
                setNeedsPro(true);
              }}
            >
              <span className="text-sm leading-none">{cat.emoji}</span> {cat.label}
            </button>
          ))}
          <button
            type="button"
            className={`cc-chip ${
              needsPro && !PRO_SERVICE_CATEGORIES.some((c) => c.slug === categorySlug)
                ? "cc-chip-active"
                : ""
            }`}
            onClick={() => setNeedsPro((v) => !v)}
          >
            🛠 Other category, but pro-level
          </button>
        </div>
        {(needsPro || PRO_SERVICE_CATEGORIES.some((c) => c.slug === categorySlug)) && (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
            🛠 Providers with verified PRC/TESDA credentials launch soon. Until then, this post
            stays open to every ✅ ID-verified provider.
          </p>
        )}
      </div>

      <div>
        <label className="cc-label" htmlFor="jpDesc">
          Details (optional)
        </label>
        <textarea
          id="jpDesc"
          className="cc-input"
          style={{ minHeight: 72, paddingTop: 10, paddingBottom: 10 }}
          placeholder="Anything providers should know — tools needed, floor, timing…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={400}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="cc-label" htmlFor="jpBrgy">
            Your barangay
          </label>
          <input
            id="jpBrgy"
            className="cc-input"
            placeholder="e.g. Barangay 28"
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            maxLength={60}
            required
          />
        </div>
        <div className="flex-1">
          <label className="cc-label" htmlFor="jpCity">
            City
          </label>
          <input
            id="jpCity"
            className="cc-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={60}
            required
          />
        </div>
      </div>

      <div>
        <span className="cc-label">When is this needed?</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`cc-chip ${flexible ? "cc-chip-active" : ""}`}
            onClick={() => setFlexible(true)}
          >
            Flexible
          </button>
          <button
            type="button"
            className={`cc-chip ${!flexible ? "cc-chip-active" : ""}`}
            onClick={() => setFlexible(false)}
          >
            Specific date
          </button>
          {!flexible && (
            <input
              type="date"
              className="cc-input"
              style={{ flex: 1, minHeight: 40 }}
              value={whenNeeded}
              onChange={(e) => setWhenNeeded(e.target.value)}
            />
          )}
        </div>
      </div>

      <div>
        <label className="cc-label" htmlFor="jpBudget">
          Budget (optional — leave blank for &ldquo;send me quotes&rdquo;)
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold"
            style={{ color: "var(--c-text-3)" }}
          >
            ₱
          </span>
          <input
            id="jpBudget"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            className="cc-input cc-num text-[15px] font-semibold"
            style={{ paddingLeft: 36 }}
            placeholder="500"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
        {pending ? "Posting…" : "Post request"}
      </button>
    </form>
  );
}
