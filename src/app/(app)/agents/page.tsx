import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { listAgents } from "@/lib/services/agents";
import { getSettings } from "@/lib/services/settings";
import { normaliseSearchParams } from "@/lib/utils/request";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { ActiveBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import {
  ClearFiltersButton,
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/shared/filter-bar";
import { AgentActions } from "@/components/agents/agent-actions";
import { formatNumber } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Agents" };
export const dynamic = "force-dynamic";

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser("/agents");
  const params = normaliseSearchParams(await searchParams);

  const [page, settings] = await Promise.all([listAgents(params), getSettings()]);

  const canEdit = can(user.role, "agent:update");
  const canToggle = can(user.role, "agent:toggle-active");
  const isFiltered = Boolean(params.q || params.status);

  return (
    <>
      <PageHeader
        title="Agents"
        description="External travel agents managed by A TO Z. Agents have no system access."
        actions={
          can(user.role, "agent:create") && (
            <Button asChild variant="brand">
              <Link href="/agents/new">
                <Plus /> Add Agent
              </Link>
            </Button>
          )
        }
      />

      <Card>
        <FilterBar>
          <SearchInput placeholder="Search name, code, phone or email…" className="w-full sm:w-80" />
          <FilterSelect
            paramKey="status"
            label="Status"
            allLabel="All statuses"
            options={[
              { value: "active", label: "Active only" },
              { value: "inactive", label: "Inactive only" },
            ]}
          />
          <ClearFiltersButton className="ml-auto" />
        </FilterBar>

        {page.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title={isFiltered ? "No agents match those filters" : "No agents yet"}
            description={
              isFiltered
                ? "Try a different search term or clear the filters."
                : "Add your first travel agent to start recording tickets and balances."
            }
            action={
              !isFiltered &&
              can(user.role, "agent:create") && (
                <Button asChild variant="brand" size="sm">
                  <Link href="/agents/new">
                    <Plus /> Add Agent
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Agent name</TH>
                    <TH>Agent code</TH>
                    <TH align="right">Tickets</TH>
                    <TH align="right">Total amount</TH>
                    <TH align="right">Paid</TH>
                    <TH align="right">Outstanding</TH>
                    <TH>Status</TH>
                    <TH align="right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {page.items.map((agent) => (
                    <TR key={agent.id}>
                      <TD>
                        <Link
                          href={`/agents/${agent.id}`}
                          className="font-medium text-navy-900 transition-colors hover:text-brand-600"
                        >
                          {agent.name}
                        </Link>
                        {agent.email && (
                          <span className="block max-w-[14rem] truncate text-[11.5px] text-navy-400">
                            {agent.email}
                          </span>
                        )}
                      </TD>
                      <TD>
                        <span className="font-mono text-[12.5px] text-navy-600">
                          {agent.code}
                        </span>
                      </TD>
                      <TD align="right" className="tabular text-navy-700">
                        {formatNumber(agent.ticketCount)}
                      </TD>
                      <TD align="right">
                        <Money amount={agent.totalAmount} currency={agent.currency} />
                      </TD>
                      <TD align="right">
                        <Money
                          amount={agent.paidAmount}
                          currency={agent.currency}
                          tone={Number(agent.paidAmount) > 0 ? "paid" : "muted"}
                        />
                      </TD>
                      <TD align="right">
                        <Money
                          amount={agent.outstandingAmount}
                          currency={agent.currency}
                          tone={Number(agent.outstandingAmount) > 0 ? "unpaid" : "muted"}
                        />
                      </TD>
                      <TD>
                        <ActiveBadge isActive={agent.isActive} />
                      </TD>
                      <TD align="right">
                        <AgentActions
                          agent={agent}
                          canEdit={canEdit}
                          canToggleActive={canToggle}
                        />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>

            <CardFooter className="p-0">
              <Pagination
                page={page.page}
                pageSize={page.pageSize}
                total={page.total}
                totalPages={page.totalPages}
                label="agents"
              />
            </CardFooter>
          </>
        )}
      </Card>

      <p className="mt-3 text-[12px] text-navy-400">
        Balances are calculated from ticket totals in {settings.defaultCurrency}.
      </p>
    </>
  );
}
