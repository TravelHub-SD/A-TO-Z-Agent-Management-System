"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Ticket, User, Wallet } from "lucide-react";
import { TicketStatus } from "@prisma/client";
import type { SearchHit } from "@/app/api/search/route";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiRequest } from "@/lib/utils/api-client";
import { cn } from "@/lib/utils/cn";

const ICONS = { agent: User, ticket: Ticket, payment: Wallet } as const;
const GROUP_LABELS = { agent: "Agents", ticket: "Tickets", payment: "Payments" } as const;

/**
 * Global lookup over agent name/code, PNR and transaction number. Results are
 * debounced and every response is checked against the latest query so a slow
 * earlier request cannot overwrite newer results.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const latestQuery = React.useRef("");

  React.useEffect(() => {
    const term = query.trim();
    latestQuery.current = term;

    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      const result = await apiRequest<{ hits: SearchHit[] }>(
        `/api/search?q=${encodeURIComponent(term)}`,
      );
      if (latestQuery.current !== term) return;
      setHits(result.ok ? result.data.hits : []);
      setHighlighted(0);
      setLoading(false);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      // ⌘K / Ctrl-K focuses search from anywhere.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const select = (hit: SearchHit) => {
    setOpen(false);
    setQuery("");
    setHits([]);
    router.push(hit.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open || hits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => (i + 1) % hits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => (i - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = hits[highlighted];
      if (hit) select(hit);
    }
  };

  const grouped = React.useMemo(() => {
    const groups: Array<{ kind: SearchHit["kind"]; items: SearchHit[] }> = [];
    for (const kind of ["agent", "ticket", "payment"] as const) {
      const items = hits.filter((hit) => hit.kind === kind);
      if (items.length) groups.push({ kind, items });
    }
    return groups;
  }, [hits]);

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-400"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-label="Search agents, PNRs and transaction numbers"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search PNR, agent or transaction number…"
        className="h-9 w-full rounded-lg border border-navy-200 bg-white pl-9 pr-12 text-[13.5px] text-navy-900 shadow-sm transition-colors placeholder:text-navy-400 focus-visible:border-brand-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500/30 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-navy-200 bg-navy-50 px-1.5 py-0.5 font-mono text-[10.5px] text-navy-400 sm:block">
        ⌘K
      </kbd>

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[24rem] overflow-y-auto rounded-lg border border-hairline bg-white p-1 shadow-[var(--shadow-overlay)] animate-in-rise"
        >
          {loading && hits.length === 0 && (
            <p className="flex items-center gap-2 px-3 py-6 text-[13px] text-navy-500">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </p>
          )}

          {!loading && hits.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-navy-500">
              No matches for &ldquo;{query.trim()}&rdquo;.
            </p>
          )}

          {grouped.map((group) => (
            <div key={group.kind} className="mb-1 last:mb-0">
              <p className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-navy-400">
                {GROUP_LABELS[group.kind]}
              </p>
              {group.items.map((hit) => {
                const Icon = ICONS[hit.kind];
                const index = hits.indexOf(hit);
                return (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === highlighted}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => select(hit)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                      index === highlighted ? "bg-navy-100" : "hover:bg-navy-50",
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-navy-400" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-navy-900">
                        {hit.title}
                      </span>
                      <span className="block truncate text-[12px] text-navy-500">
                        {hit.subtitle}
                      </span>
                    </span>
                    {hit.status && <StatusBadge status={hit.status as TicketStatus} size="sm" />}
                    {hit.amount && hit.currency && (
                      <Money
                        amount={hit.amount}
                        currency={hit.currency}
                        size="sm"
                        tone={
                          hit.status === TicketStatus.PAID || hit.kind === "payment"
                            ? "paid"
                            : hit.status === TicketStatus.UNPAID
                              ? "unpaid"
                              : "neutral"
                        }
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
