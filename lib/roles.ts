import type { Role } from "@/lib/firestore";

/**
 * Sanitize a post-auth redirect target (?next=…). Only same-app relative
 * paths are allowed — blocks open redirects via absolute URLs or //host.
 */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return null;
  if (next.length > 200 || next.includes("\n") || next.includes("\r")) return null;
  return next;
}

export function roleHomePath(role: Role | null): string {
  if (role === "provider") return "/provider";
  if (role === "admin") return "/admin";
  return "/seeker";
}
