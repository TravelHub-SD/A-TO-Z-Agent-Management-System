"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

/**
 * Filters are URL state, applied on the server. `useFilters` centralises the
 * read/write so every filter control behaves identically and resetting a
 * filter always returns to page 1.
 */
export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilters = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      // Any filter change invalidates the current page number.
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const get = React.useCallback(
    (key: string) => searchParams.get(key) ?? "",
    [searchParams],
  );

  const activeCount = React.useMemo(() => {
    let count = 0;
    searchParams.forEach((value, key) => {
      if (value && !["page", "pageSize", "sort", "dir"].includes(key)) count += 1;
    });
    return count;
  }, [searchParams]);

  return { setFilters, get, activeCount, pathname, searchParams };
}

/** Debounced search box wired to a URL parameter. */
export function SearchInput({
  paramKey = "q",
  placeholder = "Search…",
  className,
}: {
  paramKey?: string;
  placeholder?: string;
  className?: string;
}) {
  const { get, setFilters } = useFilters();
  const initial = get(paramKey);
  const [value, setValue] = React.useState(initial);

  // Keep in sync when the URL changes from elsewhere (e.g. "Clear filters").
  React.useEffect(() => setValue(initial), [initial]);

  React.useEffect(() => {
    if (value === initial) return;
    const timer = window.setTimeout(() => setFilters({ [paramKey]: value || undefined }), 350);
    return () => window.clearTimeout(timer);
  }, [value, initial, paramKey, setFilters]);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-navy-400"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8.5 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-700"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** A date range pair bound to `from`/`to` URL parameters. */
export function DateRangeFilter({
  fromKey = "from",
  toKey = "to",
  className,
}: {
  fromKey?: string;
  toKey?: string;
  className?: string;
}) {
  const { get, setFilters } = useFilters();
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Input
        type="date"
        aria-label="From date"
        value={get(fromKey)}
        max={get(toKey) || undefined}
        onChange={(event) => setFilters({ [fromKey]: event.target.value || undefined })}
        className="w-[9.5rem]"
      />
      <span className="text-navy-400" aria-hidden>–</span>
      <Input
        type="date"
        aria-label="To date"
        value={get(toKey)}
        min={get(fromKey) || undefined}
        onChange={(event) => setFilters({ [toKey]: event.target.value || undefined })}
        className="w-[9.5rem]"
      />
    </div>
  );
}

/** Native select for filter dropdowns — compact and keyboard-friendly. */
export function FilterSelect({
  paramKey,
  label,
  options,
  allLabel = "All",
  className,
}: {
  paramKey: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
  className?: string;
}) {
  const { get, setFilters } = useFilters();
  return (
    <select
      aria-label={label}
      value={get(paramKey)}
      onChange={(event) => setFilters({ [paramKey]: event.target.value || undefined })}
      className={cn(
        "h-9 rounded-lg border border-navy-200 bg-white px-2.5 text-[13px] text-navy-800 shadow-sm transition-colors focus-visible:border-brand-500",
        className,
      )}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function ClearFiltersButton({ className }: { className?: string }) {
  const { activeCount, pathname } = useFilters();
  const router = useRouter();
  if (activeCount === 0) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => router.push(pathname, { scroll: false })}
    >
      <X /> Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
    </Button>
  );
}

/** Layout shell that keeps filter controls tidy on every breakpoint. */
export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-hairline px-5 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
