import Link from "next/link";

export const metadata = {
  title: "You're offline · Community Connect",
};

export default function OfflinePage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] text-3xl"
          style={{ background: "var(--c-surface-2)", boxShadow: "var(--shadow-border)" }}
        >
          📶
        </div>
        <h1 className="mb-2 text-[24px] font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="mx-auto mb-7 max-w-[36ch] text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Community Connect needs a connection to browse services and manage
          bookings. Check your data or Wi-Fi and try again.
        </p>
        <Link href="/" className="cc-btn cc-btn-primary" style={{ width: "auto", padding: "0 24px" }}>
          Try again
        </Link>
      </div>
    </div>
  );
}
