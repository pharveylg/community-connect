import type { Role } from "@/lib/firestore";

export function roleHomePath(role: Role | null): string {
  if (role === "provider") return "/provider";
  if (role === "admin") return "/admin";
  return "/seeker";
}
