"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils/cn";

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-[13px] font-medium leading-none text-navy-700 peer-disabled:opacity-60",
      className,
    )}
    {...props}
  >
    {children}
    {required && <span className="ml-0.5 text-unpaid-600" aria-hidden>*</span>}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
