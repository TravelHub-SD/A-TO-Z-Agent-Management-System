"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-navy-800 text-white shadow-sm hover:bg-navy-700 active:bg-navy-900",
        brand:
          "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
        outline:
          "border border-navy-200 bg-white text-navy-800 shadow-sm hover:bg-navy-50 hover:border-navy-300",
        ghost: "text-navy-600 hover:bg-navy-100 hover:text-navy-900",
        subtle: "bg-navy-100 text-navy-800 hover:bg-navy-200",
        success:
          "bg-paid-600 text-white shadow-sm hover:bg-paid-700 active:bg-paid-800",
        danger:
          "bg-unpaid-600 text-white shadow-sm hover:bg-unpaid-700 active:bg-unpaid-800",
        dangerOutline:
          "border border-unpaid-200 bg-white text-unpaid-700 hover:bg-unpaid-50",
        link: "text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

/**
 * A loading button is also a disabled button — that is what stops a form from
 * being submitted twice while the first request is still in flight.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
