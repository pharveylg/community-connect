import Link from "next/link";

export const metadata = {
  title: "You're offline · Community Connect",
};

export default function OfflinePage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mb-3 text-3xl">📶</div>
        <h1 className="mb-1.5 text-lg font-semibold">You&apos;re offline</h1>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Community Connect needs a connection to browse services and manage
          bookings. Check your data or Wi-Fi and try again.
        </p>
        <Link href="/" className="cc-btn cc-btn-primary">
          Try again
        </Link>
      </div>
    </div>
  );
}
