"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Top-level error boundary. Users see a plain message; the underlying error
 * stays in the server logs so no database detail is exposed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app] render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-hairline bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-unpaid-50">
          <AlertTriangle className="size-5 text-unpaid-600" />
        </div>
        <h1 className="text-[15px] font-semibold text-navy-900">Something went wrong</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-navy-500">
          The page could not be displayed. Try again, and contact your system
          administrator if the problem continues.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-navy-400">Reference: {error.digest}</p>
        )}
        <Button variant="brand" className="mt-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
