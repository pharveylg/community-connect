import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] text-3xl"
          style={{ background: "var(--c-accent-light)" }}
        >
          🧭
        </div>
        <h1 className="mb-2 text-[24px] font-semibold tracking-tight">Page not found</h1>
        <p className="mx-auto mb-7 max-w-[36ch] text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link href="/" className="cc-btn cc-btn-primary" style={{ width: "auto", padding: "0 24px" }}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
