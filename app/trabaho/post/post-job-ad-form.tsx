"use client";

import { useState, type FormEvent } from "react";
import { createJobAdAction } from "@/app/actions/trabaho";
import { WORK_CATEGORIES } from "@/lib/catalog";
import { isNextRedirect } from "@/lib/client-errors";

const POSTER_TYPES = [
  { id: "household", label: "🏠 Household" },
  { id: "business", label: "🏪 Small business" },
] as const;

const EMPLOYMENT_TYPES = [
  { id: "full_time", label: "Full-time" },
  { id: "part_time", label: "Part-time" },
  { id: "contract", label: "Contract / temporary" },
] as const;

const SALARY_PERIODS = [
  { id: "day", label: "per day" },
  { id: "week", label: "per week" },
  { id: "month", label: "per month" },
] as const;

const CARE_CATEGORIES = new Set(["kasambahay-yaya", "househelp"]);

export function PostJobAdForm({
  defaultBarangay,
  defaultCity,
  posterName,
}: {
  defaultBarangay: string;
  defaultCity: string;
  posterName: string;
}) {
  const [posterType, setPosterType] = useState<"household" | "business">("household");
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [employmentType, setEmploymentType] = useState<string>("full_time");
  const [schedule, setSchedule] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [barangay, setBarangay] = useState(defaultBarangay);
  const [city, setCity] = useState(defaultCity);
  const [kasambahayAck, setKasambahayAck] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isCare = categorySlug != null && CARE_CATEGORIES.has(categorySlug);
  const showAck = posterType === "household" && isCare;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categorySlug) {
      setError("Please choose a work category.");
      return;
    }
    setPending(true);
    try {
      const result = await createJobAdAction({
        posterType,
        title,
        description,
        categorySlug,
        employmentType,
        schedule,
        salaryMin: salaryMin.trim() === "" ? null : Number(salaryMin),
        salaryMax: salaryMax.trim() === "" ? null : Number(salaryMax),
        salaryPeriod,
        barangay,
        city,
        kasambahayAck,
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
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-sm md:max-w-md flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[14px] text-xl"
          style={{ background: "var(--c-accent-light)" }}
        >
          💼
        </div>
        <div>
          <div className="text-sm font-semibold">Post a job — free</div>
          <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
            Posting as {posterName.split(" ")[0]} · ✅ verified
          </div>
        </div>
      </div>

      {error && <p className="cc-error">{error}</p>}

      <div>
        <span className="cc-label">Who&apos;s hiring?</span>
        <div className="flex flex-wrap gap-1.5">
          {POSTER_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`cc-chip ${posterType === t.id ? "cc-chip-active" : ""}`}
              onClick={() => setPosterType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="cc-label" htmlFor="jaTitle">
          Job title
        </label>
        <input
          id="jaTitle"
          className="cc-input"
          placeholder="e.g. Yaya for 2 kids, Store helper…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          required
        />
      </div>

      <div>
        <span className="cc-label">Work category</span>
        <div className="flex flex-wrap gap-1.5">
          {WORK_CATEGORIES.map((cat) => (
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
        <span className="cc-label">Employment type</span>
        <div className="flex flex-wrap gap-1.5">
          {EMPLOYMENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`cc-chip ${employmentType === t.id ? "cc-chip-active" : ""}`}
              onClick={() => setEmploymentType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="cc-label" htmlFor="jaSchedule">
          Schedule (optional)
        </label>
        <input
          id="jaSchedule"
          className="cc-input"
          placeholder="e.g. Mon–Sat 8am–5pm, starts ASAP"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          maxLength={120}
        />
      </div>

      <div>
        <span className="cc-label">
          Salary (optional —{" "}
          <span style={{ color: "var(--c-text-3)" }}>shown ads get more applicants</span>)
        </span>
        <div className="flex items-center gap-2">
          <input
            aria-label="Salary minimum"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            className="cc-input cc-num"
            style={{ flex: 1 }}
            placeholder="Min ₱"
            value={salaryMin}
            onChange={(e) => {
              setSalaryMin(e.target.value);
              if (e.target.value && !salaryPeriod) setSalaryPeriod("day");
            }}
          />
          <span style={{ color: "var(--c-text-3)" }}>–</span>
          <input
            aria-label="Salary maximum"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            className="cc-input cc-num"
            style={{ flex: 1 }}
            placeholder="Max ₱"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
          />
        </div>
        {(salaryMin.trim() !== "" || salaryPeriod) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SALARY_PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`cc-chip ${salaryPeriod === p.id ? "cc-chip-active" : ""}`}
                onClick={() => setSalaryPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="cc-label" htmlFor="jaDesc">
          Details (optional)
        </label>
        <textarea
          id="jaDesc"
          className="cc-input"
          style={{ minHeight: 72, paddingTop: 10, paddingBottom: 10 }}
          placeholder="What the work involves, who they'll care for, what you provide…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={400}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="cc-label" htmlFor="jaBrgy">
            Barangay
          </label>
          <input
            id="jaBrgy"
            className="cc-input"
            placeholder="e.g. Barangay 28"
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            maxLength={60}
            required
          />
        </div>
        <div className="flex-1">
          <label className="cc-label" htmlFor="jaCity">
            City
          </label>
          <input
            id="jaCity"
            className="cc-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={60}
            required
          />
        </div>
      </div>

      {showAck && (
        <div className="cc-card text-xs leading-relaxed" style={{ boxShadow: "0 0 0 1px var(--c-accent), var(--shadow-border)" }}>
          <div className="mb-1.5 font-semibold">Kasambahay Law basics (RA 10361)</div>
          <ul className="mb-2 ml-4 list-disc" style={{ color: "var(--c-text-2)" }}>
            <li>Written contract before work starts</li>
            <li>At least the regional kasambahay minimum wage</li>
            <li>SSS, PhilHealth &amp; Pag-IBIG contributions are the employer&apos;s duty</li>
            <li>Weekly rest day and humane working conditions</li>
          </ul>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={kasambahayAck}
              onChange={(e) => setKasambahayAck(e.target.checked)}
              className="mt-0.5"
            />
            <span style={{ color: "var(--c-text-2)" }}>
              I understand these basics and will follow the Kasambahay Law.
            </span>
          </label>
        </div>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--c-text-3)" }}>
        Philippines jobs only. You can never charge workers any fee — asking for
        &quot;processing&quot; or &quot;placement&quot; fees gets ads removed and
        accounts banned.
      </p>

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--c-text-3)" }}>
        Posts are reviewed. Illegal content is reported to authorities.
      </p>
      <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
        {pending ? "Posting…" : "Post job ad — free"}
      </button>
    </form>
  );
}
