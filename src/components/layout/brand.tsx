import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** The A TO Z wordmark used in the sidebar and on the login screen. */
export function Brand({
  agencyName,
  className,
  tone = "dark",
  href = "/dashboard",
}: {
  agencyName: string;
  className?: string;
  tone?: "dark" | "light";
  href?: string | null;
}) {
  const content = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold tracking-tight shadow-sm",
          tone === "dark" ? "bg-brand-600 text-white" : "bg-navy-900 text-white",
        )}
        aria-hidden
      >
        AZ
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-[14.5px] font-semibold leading-tight tracking-tight",
            tone === "dark" ? "text-white" : "text-navy-900",
          )}
        >
          A TO Z
        </span>
        <span
          className={cn(
            "block truncate text-[11.5px] leading-tight",
            tone === "dark" ? "text-navy-300" : "text-navy-500",
          )}
        >
          {agencyName}
        </span>
      </span>
    </span>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
