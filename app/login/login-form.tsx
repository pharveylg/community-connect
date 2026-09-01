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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="cc-btn cc-btn-primary" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
