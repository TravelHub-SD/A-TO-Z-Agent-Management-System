import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        paid: "border-paid-200 bg-paid-50 text-paid-700",
        unpaid: "border-unpaid-200 bg-unpaid-50 text-unpaid-700",
        warn: "border-warn-200 bg-warn-50 text-warn-700",
        neutral: "border-navy-200 bg-navy-50 text-navy-600",
        brand: "border-brand-200 bg-brand-50 text-brand-700",
        solid: "border-transparent bg-navy-800 text-white",
      },
      size: {
        sm: "px-2 py-px text-[10.5px]",
        md: "",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
