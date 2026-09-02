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
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] text-3xl"
          style={{ background: "var(--c-danger-light)" }}
        >
          😅
        </div>
        <h1 className="mb-2 text-[24px] font-semibold tracking-tight">Something went wrong</h1>
        <p className="mx-auto mb-7 max-w-[36ch] text-sm leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          An unexpected error occurred. Please try again — if it keeps happening,
          come back later.
        </p>
        <button
          type="button"
          className="cc-btn cc-btn-primary"
          style={{ width: "auto", padding: "0 24px" }}
          onClick={retry}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
