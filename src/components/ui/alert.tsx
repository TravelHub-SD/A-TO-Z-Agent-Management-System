import * as React from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TONES = {
  info: { icon: Info, wrap: "border-brand-200 bg-brand-50", icn: "text-brand-600", text: "text-brand-900" },
  warning: { icon: AlertTriangle, wrap: "border-warn-200 bg-warn-50", icn: "text-warn-600", text: "text-warn-800" },
  danger: { icon: ShieldAlert, wrap: "border-unpaid-200 bg-unpaid-50", icn: "text-unpaid-600", text: "text-unpaid-800" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const config = TONES[tone];
  const Icon = config.icon;
  return (
    <div
      role={tone === "info" ? "note" : "alert"}
      className={cn("flex gap-3 rounded-lg border p-3.5", config.wrap, className)}
    >
      <Icon className={cn("mt-px size-4.5 shrink-0", config.icn)} />
      <div className={cn("min-w-0 flex-1 text-[13px] leading-relaxed", config.text)}>
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
