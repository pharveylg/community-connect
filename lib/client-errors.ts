// Client-safe error helpers for server-action calls.

/**
 * True when the error is Next.js's internal NEXT_REDIRECT error — i.e. the
 * action succeeded and a navigation is already in progress. Callers must
 * swallow it (keep the button pending; the router completes the redirect)
 * instead of showing "something went wrong".
 */
export function isNextRedirect(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
