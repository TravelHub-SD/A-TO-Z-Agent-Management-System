"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Copies a reference (PNR, transaction number) to the clipboard. */
export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked; silently ignore rather than alarm.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label} ${value}`}
      className={cn(
        "rounded p-1 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-700",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-paid-600" /> : <Copy className="size-3.5" />}
    </button>
  );
}
