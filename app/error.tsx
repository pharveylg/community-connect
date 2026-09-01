"use client";

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mb-3 text-3xl">😅</div>
        <h1 className="mb-1.5 text-lg font-semibold">Something went wrong</h1>
        <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
          An unexpected error occurred. Please try again — if it keeps happening,
          come back later.
        </p>
        <button type="button" className="cc-btn cc-btn-primary" onClick={retry}>
          Try again
        </button>
      </div>
    </div>
  );
}
