import Link from "next/link";

/** Visible back control (40px touch target) for pages that need one. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
      style={{ color: "var(--c-accent)", minHeight: 40 }}
    >
      ← {label}
    </Link>
  );
}
