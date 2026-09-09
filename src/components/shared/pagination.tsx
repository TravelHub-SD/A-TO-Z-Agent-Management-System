"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZES } from "@/lib/constants";
import { formatNumber } from "@/lib/utils/currency";

/**
 * Server-side pagination: page and page size live in the URL so a filtered
 * view is shareable and the browser back button behaves.
 */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  label = "records",
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  };

  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12.5px] text-navy-500">
        Showing <span className="tabular font-medium text-navy-700">{formatNumber(first)}</span>–
        <span className="tabular font-medium text-navy-700">{formatNumber(last)}</span> of{" "}
        <span className="tabular font-medium text-navy-700">{formatNumber(total)}</span> {label}
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[12.5px] text-navy-500">
          <span className="hidden sm:inline">Rows</span>
          <select
            value={pageSize}
            onChange={(event) => go({ pageSize: event.target.value, page: "1" })}
            className="h-8 rounded-md border border-navy-200 bg-white px-2 text-[12.5px] text-navy-800 shadow-sm"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="iconSm"
            disabled={page <= 1}
            onClick={() => go({ page: String(page - 1) })}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="tabular px-2 text-[12.5px] font-medium text-navy-700">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="iconSm"
            disabled={page >= totalPages}
            onClick={() => go({ page: String(page + 1) })}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
