"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { firebaseErrorMessage } from "@/lib/firebase-error";
import { RegisterBasicInfoSchema, DependentSchema } from "@/lib/validation";
import {
  registerAccount,
  setRole,
  setBookingFor,
  addDependentAction,
  skipDependentSetup,
} from "@/app/actions/auth";

type Step = "basic" | "role" | "seekerOnboard" | "dependentSetup";

const STEP_PROGRESS: Record<Step, number> = {
  basic: 33,
  role: 66,
  seekerOnboard: 85,
  dependentSetup: 95,
};

export function RegisterFlow() {
  const [step, setStep] = useState<Step>("basic");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    setError(null);

    const parsed = RegisterBasicInfoSchema.safeParse({ fullName, mobile, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setPending(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        parsed.data.email,
        parsed.data.password
      );
      const idToken = await credential.user.getIdToken();
      const result = await registerAccount(idToken, {
        fullName: parsed.data.fullName,
        mobile: parsed.data.mobile,
        email: parsed.data.email,
      });
      if (result.error) {
        setError(result.error);
        setPending(false);
        return;
      }
      setStep("role");
      setPending(false);
    } catch (err) {
      setError(firebaseErrorMessage(err));
      setPending(false);
    }
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
    setError(null);

    const parsed = DependentSchema.safeParse({
      name: depName,
      relationship: depRelationship,
      notes: depNotes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setPending(true);
    try {
      await addDependentAction(parsed.data);
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
    // Redirects server-side on success.
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

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
      >

      {step === "basic" && (
        <>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--c-text-3)" }}>
            Step 1 of 3
          </div>
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight">Create your account</h1>
          <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
            Basic details — takes about a minute.
          </p>
          <form onSubmit={handleBasicSubmit} className="flex flex-col gap-4">
            <div>
              <label className="cc-label" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                className="cc-input"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="cc-label" htmlFor="mobile">
                Mobile number
              </label>
              <input
                id="mobile"
                type="tel"
                className="cc-input"
                placeholder="e.g. 0917 123 4567"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="cc-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="cc-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="cc-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="cc-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="cc-btn cc-btn-primary mt-1" disabled={pending}>
              {pending ? "Creating account…" : "Continue"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm" style={{ color: "var(--c-text-2)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-medium" style={{ color: "var(--c-accent)" }}>
              Log in
            </Link>
          </p>
        </>
      )}

      {step === "role" && (
        <>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--c-text-3)" }}>
            Step 2 of 3
          </div>
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight">
            How will you use Community Connect?
          </h1>
          <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
            Choose your role — you can&apos;t change this later without contacting support.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="cc-role-card"
              disabled={pending}
              onClick={() => handleSelectRole("seeker")}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-2xl"
                style={{ background: "var(--c-accent-light)" }}
              >
                🔍
              </span>
              <span>
                <span className="mb-1 block text-[15px] font-semibold">Service seeker</span>
                <span className="block text-[13px] leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                  Book transport, handymen, caregivers, and more — for yourself or a
                  family member. Free, always.
                </span>
              </span>
            </button>
            <button
              type="button"
              className="cc-role-card"
              disabled={pending}
              onClick={() => handleSelectRole("provider")}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-2xl"
                style={{ background: "var(--c-success-light)" }}
              >
                🛠
              </span>
              <span>
                <span className="mb-1 block text-[15px] font-semibold">Service provider</span>
                <span className="block text-[13px] leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                  List your services and set your own rates — even services you
                  invent, like trash pickup or junk hauling.
                </span>
              </span>
            </button>
          </div>
        </>
      )}

      {step === "seekerOnboard" && (
        <>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--c-text-3)" }}>
            Step 3 of 3
          </div>
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight">Who are you booking for?</h1>
          <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
            Booking preference — helps providers prepare.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="cc-role-card"
              disabled={pending}
              onClick={() => handleBookingFor("self")}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-2xl"
                style={{ background: "var(--c-accent-light)" }}
              >
                🙋
              </span>
              <span>
                <span className="mb-1 block text-[15px] font-semibold">Myself</span>
                <span className="block text-[13px] leading-relaxed" style={{ color: "var(--c-text-2)" }}>
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
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-2xl"
                style={{ background: "#fdf3dc" }}
              >
                👴
              </span>
              <span>
                <span className="mb-1 block text-[15px] font-semibold">A family member</span>
                <span className="block text-[13px] leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                  I am booking on behalf of a parent, grandparent, or someone I care for.
                </span>
              </span>
            </button>
          </div>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="cc-btn cc-btn-ghost"
              style={{ width: "auto", fontSize: 13 }}
              disabled={pending}
              onClick={() => handleBookingFor("self")}
            >
              I&apos;ll decide later
            </button>
          </div>
        </>
      )}

      {step === "dependentSetup" && (
        <>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--c-text-3)" }}>
            Almost done
          </div>
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight">Add a dependent profile</h1>
          <p className="mb-6 text-[13px] leading-relaxed" style={{ color: "var(--c-text-3)" }}>
            This name will appear when you book services on their behalf. You can
            add more profiles later from account settings.
          </p>
          <form onSubmit={handleDependentSubmit} className="flex flex-col gap-4">
            <div>
              <label className="cc-label" htmlFor="depName">
                Dependent&apos;s full name
              </label>
              <input
                id="depName"
                className="cc-input"
                placeholder="e.g. Maria Santos"
                value={depName}
                onChange={(e) => setDepName(e.target.value)}
              />
            </div>
            <div>
              <label className="cc-label" htmlFor="depRelationship">
                Your relationship to them
              </label>
              <input
                id="depRelationship"
                className="cc-input"
                placeholder="e.g. Mother, Father, Grandparent"
                value={depRelationship}
                onChange={(e) => setDepRelationship(e.target.value)}
              />
            </div>
            <div>
              <label className="cc-label" htmlFor="depNotes">
                Notes for providers (optional)
              </label>
              <textarea
                id="depNotes"
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
          </form>
          <div className="mt-3 text-center">
            <button
              type="button"
              className="cc-btn cc-btn-ghost"
              style={{ width: "auto", fontSize: 13 }}
              disabled={pending}
              onClick={() => {
                void guard(() => skipDependentSetup());
              }}
            >
              Skip for now
            </button>
          </div>
        </>
      )}
      </motion.div>
    </div>
  );
}
