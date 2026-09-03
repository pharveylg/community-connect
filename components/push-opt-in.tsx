"use client";

import { useState } from "react";
import { enablePush } from "@/lib/push-client";

/**
 * In-context push opt-in. Renders ONLY while permission is "default"
 * (never nags granted/denied users) and remembers dismissal locally.
 */
export function PushOptIn({ context }: { context: "seeker" | "provider" }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "denied" | "error">("idle");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (typeof window === "undefined") return null;
  if (typeof Notification === "undefined") return null;
  if (Notification.permission !== "default") return null;

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  async function handleEnable() {
    setState("busy");
    const result = await enablePush();
    setState(result === "granted" ? "done" : result === "denied" ? "denied" : "error");
  }

  const enableLabel = state === "busy" ? "Enabling…" : "Enable push";

  return (
    <div className="cc-card mb-4">
      <div className="mb-1 text-sm font-semibold">🔔 Get a buzz when it matters</div>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
        {state === "denied"
          ? "Notifications are blocked in your browser settings — you can turn them on anytime."
          : state === "error"
            ? "Something went wrong enabling push — you can try again anytime."
            : state === "done"
              ? "Push is on for this device ✅"
              : context === "seeker"
                ? "Be notified the moment a provider makes an offer or accepts your booking."
                : "Be notified the moment a booking request, job offer, or applicant comes in."}
      </p>
      {state === "idle" || state === "error" ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cc-btn cc-btn-primary"
            style={{ width: "auto", padding: "0 16px", minHeight: 36, fontSize: 12.5 }}
            disabled={isIOS && !standalone}
            onClick={handleEnable}
          >
            {enableLabel}
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-ghost"
            style={{ width: "auto", padding: "0 12px", minHeight: 36, fontSize: 12 }}
            onClick={() => setDismissed(true)}
          >
            Not now
          </button>
        </div>
      ) : null}
      {isIOS && !standalone && (state === "idle" || state === "error") && (
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--c-text-3)" }}>
          On iPhone/iPad: share this page → “Add to Home Screen” first, then open the app
          to enable notifications.
        </p>
      )}
    </div>
  );
}
