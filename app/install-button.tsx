"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Android/desktop Chrome fires beforeinstallprompt when the PWA is
 * installable. iOS Safari never does — iOS users get the hint line below
 * instead (Share → Add to Home Screen).
 */
export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Already installed (running standalone)? Never show the prompt.
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || !deferred) return null;

  async function install() {
    const event = deferred;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setDeferred(null);
    setHidden(true);
  }

  return (
    <div className="mt-4 rounded-[16px] p-3.5 text-left" style={{ background: "var(--c-surface-2)" }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">📲 Install Community Connect</span>
        <button
          type="button"
          aria-label="Dismiss"
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs"
          style={{ color: "var(--c-text-3)" }}
          onClick={() => setHidden(true)}
        >
          ✕
        </button>
      </div>
      <button
        type="button"
        className="cc-btn cc-btn-primary"
        style={{ minHeight: 42, fontSize: 13.5 }}
        onClick={install}
      >
        Install app
      </button>
      <p className="mt-2.5 text-[11px] leading-snug" style={{ color: "var(--c-text-3)" }}>
        On iPhone: open this page in Safari, tap Share, then &ldquo;Add to Home
        Screen&rdquo;.
      </p>
    </div>
  );
}
