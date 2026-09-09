"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { useFilters } from "@/components/shared/filter-bar";

/** Debounced numeric filter bound to a URL parameter. */
export function AmountFilter({
  paramKey,
  placeholder,
}: {
  paramKey: string;
  placeholder: string;
}) {
  const { get, setFilters } = useFilters();
  const initial = get(paramKey);
  const [value, setValue] = React.useState(initial);

  React.useEffect(() => setValue(initial), [initial]);

  React.useEffect(() => {
    if (value === initial) return;
    const timer = window.setTimeout(
      () => setFilters({ [paramKey]: value || undefined }),
      400,
    );
    return () => window.clearTimeout(timer);
  }, [value, initial, paramKey, setFilters]);

  return (
    <Input
      inputMode="decimal"
      value={value}
      aria-label={placeholder}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      className="tabular w-28"
    />
  );
}
