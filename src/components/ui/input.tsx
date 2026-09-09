import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-9 w-full rounded-lg border border-navy-200 bg-white px-3 py-1 text-sm text-navy-900 shadow-sm transition-colors",
        "placeholder:text-navy-400",
        "focus-visible:border-brand-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500/30",
        "disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-400",
        invalid && "border-unpaid-400 focus-visible:border-unpaid-500 focus-visible:outline-unpaid-500/30",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      "flex min-h-[80px] w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm transition-colors",
      "placeholder:text-navy-400",
      "focus-visible:border-brand-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500/30",
      "disabled:cursor-not-allowed disabled:bg-navy-50",
      invalid && "border-unpaid-400",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
