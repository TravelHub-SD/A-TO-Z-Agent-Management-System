"use client";

import Link from "next/link";
import type { TopAgentPoint } from "@/lib/services/types";
import { Money } from "@/components/shared/money";
import { moneyToNumber } from "@/lib/utils/currency";

/**
 * A horizontal bar list rather than a chart library call: at five rows a
 * labelled bar reads faster than a rendered chart, and it stays legible on a
 * phone.
 */
export function OutstandingByAgent({
  agents,
  currency,
}: {
  agents: TopAgentPoint[];
  currency: string;
}) {
  const max = Math.max(...agents.map((a) => moneyToNumber(a.outstanding)), 1);

  return (
    <ul className="space-y-3 px-5 py-4">
      {agents.map((agent) => {
        const value = moneyToNumber(agent.outstanding);
        const width = Math.max(2, (value / max) * 100);
        return (
          <li key={agent.agentId}>
            <Link href={`/agents/${agent.agentId}`} className="group block">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] font-medium text-navy-800 transition-colors group-hover:text-brand-700">
                  {agent.name}
                </span>
                <Money amount={agent.outstanding} currency={currency} tone="unpaid" size="sm" />
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-full rounded-full bg-unpaid-500 transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
