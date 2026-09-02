"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  addDependentAction,
  completeProfile,
  setBookingFor,
  setRole,
  skipDependentSetup,
} from "@/app/actions/auth";
import { CompleteProfileSchema, DependentSchema } from "@/lib/validation";

type Step = "basic" | "role" | "seekerOnboard" | "dependentSetup";

export function CompleteProfileFlow({
  email,
  hasProfile,
}: {
  email: string;
  hasProfile: boolean;
}) {
  const [step, setStep] = useState<Step>(hasProfile ? "role" : "basic");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");

  const [depName, setDepName] = useState("");
  const [depRelationship, setDepRelationship] = useState("");
  const [depNotes, setDepNotes] = useState("");

  async function guard(fn: () => Promise<unknown>) {
    // Wrap server-action calls so a network/server error never leaves the
    // buttons stuck in a disabled "pending" state.
    setError(null);
    setPending(true);
    try {
      await fn();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  async function handleBasicSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = CompleteProfileSchema.safeParse({ fullName, mobile });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    await guard(async () => {
      const result = await completeProfile(parsed.data);
      if (result?.error) {
        setError(result.error);
        setPending(false);
        return;
      }
      setStep("role");
      setPending(false);
    });
  }

  async function handleSelectRole(role: "seeker" | "provider") {
    await guard(async () => {
      const result = await setRole(role);
      if (result?.error) {
        setError(result.error);
        setPending(false);
        return;
      }
      if (result?.next === "seekerOnboard") {
        setStep("seekerOnboard");
        setPending(false);
      }
      // "provider" redirects server-side.
    });
  }

  async function handleBookingFor(bookingFor: "self" | "dependent") {
    await guard(async () => {
      const result = await setBookingFor(bookingFor);
      if (result?.next === "dependentSetup") {
        setStep("dependentSetup");
        setPending(false);
      }
      // "self" redirects server-side.
    });
  }

  async function handleDependentSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = DependentSchema.safeParse({
      name: depName,
      relationship: depRelationship,
      notes: depNotes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    await guard(() => addDependentAction(parsed.data));
  }

  return (
    <div>
      {error && <p className="cc-error mb-4">{error}</p>}

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
      >

      {step === "basic" && (
        <form onSubmit={handleBasicSubmit} className="flex flex-col gap-4">
          <div>
            <label className="cc-label" htmlFor="obFullName">
              Full name
            </label>
            <input
              id="obFullName"
              className="cc-input"
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="cc-label" htmlFor="obMobile">
              Mobile number
            </label>
            <input
              id="obMobile"
              type="tel"
              className="cc-input"
              placeholder="e.g. 0917 123 4567"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
            Account email: {email || "—"}
          </div>
          <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Continue"}
          </button>
        </form>
      )}

      {step === "role" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="cc-role-card"
            disabled={pending}
            onClick={() => handleSelectRole("seeker")}
          >
            <span className="text-2xl">🔍</span>
            <span>
              <span className="mb-0.5 block font-semibold">Service seeker</span>
              <span className="text-xs" style={{ color: "var(--c-text-2)" }}>
                Find and book local providers — for yourself or a family member.
              </span>
            </span>
          </button>
          <button
            type="button"
            className="cc-role-card"
            disabled={pending}
            onClick={() => handleSelectRole("provider")}
          >
            <span className="text-2xl">🛠</span>
            <span>
              <span className="mb-0.5 block font-semibold">Service provider</span>
              <span className="text-xs" style={{ color: "var(--c-text-2)" }}>
                List your services, set your own rates — even services you invent,
                like trash pickup or junk hauling.
              </span>
            </span>
          </button>
        </div>
      )}

      {step === "seekerOnboard" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="cc-role-card"
            disabled={pending}
            onClick={() => handleBookingFor("self")}
          >
            <span className="text-2xl">🙋</span>
            <span>
              <span className="mb-0.5 block font-semibold">Myself</span>
              <span className="text-xs" style={{ color: "var(--c-text-2)" }}>
                I will personally be using the services I book.
              </span>
            </span>
          </button>
          <button
            type="button"
            className="cc-role-card"
            disabled={pending}
            onClick={() => handleBookingFor("dependent")}
          >
            <span className="text-2xl">👴</span>
            <span>
              <span className="mb-0.5 block font-semibold">A family member</span>
              <span className="text-xs" style={{ color: "var(--c-text-2)" }}>
                I am booking on behalf of a parent, grandparent, or someone I care for.
              </span>
            </span>
          </button>
          <div className="mt-2 text-center">
            <button
              type="button"
              className="text-sm"
              style={{ color: "var(--c-text-3)" }}
              disabled={pending}
              onClick={() => handleBookingFor("self")}
            >
              I&apos;ll decide later
            </button>
          </div>
        </div>
      )}

      {step === "dependentSetup" && (
        <form onSubmit={handleDependentSubmit} className="flex flex-col gap-4">
          <div>
            <label className="cc-label" htmlFor="obDepName">
              Dependent&apos;s full name
            </label>
            <input
              id="obDepName"
              className="cc-input"
              placeholder="e.g. Maria Santos"
              value={depName}
              onChange={(e) => setDepName(e.target.value)}
            />
          </div>
          <div>
            <label className="cc-label" htmlFor="obDepRel">
              Your relationship to them
            </label>
            <input
              id="obDepRel"
              className="cc-input"
              placeholder="e.g. Mother, Father, Grandparent"
              value={depRelationship}
              onChange={(e) => setDepRelationship(e.target.value)}
            />
          </div>
          <div>
            <label className="cc-label" htmlFor="obDepNotes">
              Notes for providers (optional)
            </label>
            <textarea
              id="obDepNotes"
              className="cc-input"
              style={{ minHeight: 80, paddingTop: 10, paddingBottom: 10 }}
              placeholder="e.g. Needs wheelchair access, prefers morning appointments…"
              value={depNotes}
              onChange={(e) => setDepNotes(e.target.value)}
            />
          </div>
          <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save and finish"}
          </button>
          <div className="text-center">
            <button
              type="button"
              className="text-sm"
              style={{ color: "var(--c-text-3)" }}
              disabled={pending}
              onClick={() => guard(() => skipDependentSetup())}
            >
              Skip for now
            </button>
          </div>
        </form>
      )}
      </motion.div>
    </div>
  );
}
