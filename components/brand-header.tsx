import Link from "next/link";

/**
 * Persistent brand header — on every page. Tapping it goes home
 * (anonymous -> landing marketplace; logged in -> their role home,
 * since "/" routes by session).
 */
export function BrandHeader() {
  return (
    <header
      className="cc-glass sticky top-0 z-40 flex items-center px-4 py-2.5"
      style={{ boxShadow: "var(--shadow-border)" }}
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 text-sm font-semibold"
        aria-label="Community Connect — home"
        style={{ minHeight: 40 }}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[10px] text-base"
          style={{ background: "linear-gradient(135deg,#0b4480,#0e7a5f)" }}
        >
          🤝
        </span>
        <span className="cc-gradient-text">Community Connect</span>
      </Link>
    </header>
  );
}
