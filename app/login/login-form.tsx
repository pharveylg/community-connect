"use client";

import { useState, type FormEvent } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { firebaseErrorMessage } from "@/lib/firebase-error";
import { LoginSchema } from "@/lib/validation";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setPending(true);
    try {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        parsed.data.email,
        parsed.data.password
      );
      const idToken = await credential.user.getIdToken();
      await login(idToken);
    } catch (err) {
      setError(firebaseErrorMessage(err));
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
          🔐
        </div>
        <div>
          <div className="text-sm font-semibold">Sign in</div>
          <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
            Welcome back to the barangay
          </div>
        </div>
      </div>

      {error && <p className="cc-error">{error}</p>}

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
          required
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
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
