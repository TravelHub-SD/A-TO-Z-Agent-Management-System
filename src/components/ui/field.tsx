import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

/**
 * One form row: label, control, optional hint, and the validation message.
 * Errors are rendered with `role="alert"` so screen readers announce them.
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string | string[] | null;
  children: React.ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {message ? (
        <p role="alert" className="text-[12.5px] font-medium text-unpaid-600">
          {message}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-navy-500">{hint}</p>
      ) : null}
    </div>
  );
}
