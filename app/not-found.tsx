import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mb-3 text-3xl">🧭</div>
        <h1 className="mb-1.5 text-lg font-semibold">Page not found</h1>
        <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link href="/" className="cc-btn cc-btn-primary">
          Back to home
        </Link>
      </div>
    </div>
  );
}
