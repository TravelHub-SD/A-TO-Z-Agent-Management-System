import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Plus,
  Receipt,
  Ticket as TicketIcon,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { getSettings } from "@/lib/services/settings";
import { listAgentOptions } from "@/lib/services/agents";
import {
  getDashboardStats,
  getMonthlyTrend,
  getRecentTickets,
  getTopOutstandingAgents,
} from "@/lib/services/dashboard";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TicketTable } from "@/components/tickets/ticket-table";
import { TicketFormDialog } from "@/components/tickets/ticket-form-dialog";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { OutstandingByAgent } from "@/components/dashboard/outstanding-chart";
import { formatMoney, formatNumber } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser("/dashboard");
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Outstanding balances and recent activity across all agents.`}
        actions={<QuickActions canCreateTicket={can(user.role, "ticket:create")} />}
      />

      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Billed vs collected</CardTitle>
              </CardHeader>
              <div className="h-[240px]" />
            </Card>
          }
        >
          <TrendPanel />
        </Suspense>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Top outstanding</CardTitle>
              </CardHeader>
              <div className="h-[240px]" />
            </Card>
          }
        >
          <OutstandingPanel />
        </Suspense>
      </div>

      <div className="mt-5">
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Recent tickets</CardTitle>
              </CardHeader>
              <TableSkeleton rows={5} columns={6} />
            </Card>
          }
        >
          <RecentTickets timezone={settings.timezone} />
        </Suspense>
      </div>
    </>
  );
}

async function QuickActions({ canCreateTicket }: { canCreateTicket: boolean }) {
  const agents = await listAgentOptions();
  const settings = await getSettings();

  return (
    <>
      <Button asChild variant="outline" size="sm">
        <Link href="/tickets/unpaid">
          <CircleDollarSign /> View Outstanding
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/payments">
          <Wallet /> View Payments
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/agents/new">
          <Plus /> Add Agent
        </Link>
      </Button>
      {canCreateTicket && agents.length > 0 && (
        <TicketFormDialog
          agents={agents}
          defaultCurrency={settings.defaultCurrency}
          trigger={
            <Button variant="brand" size="sm">
              <Plus /> Add Ticket
            </Button>
          }
        />
      )}
    </>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
}

async function Stats() {
  const stats = await getDashboardStats();

  const collectionRate =
    Number(stats.totalAmount) > 0
      ? Math.round((Number(stats.totalPaid) / Number(stats.totalAmount)) * 100)
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Agents"
        value={formatNumber(stats.activeAgents)}
        icon={Users}
        href="/agents"
        caption={
          stats.totalAgents === stats.activeAgents
            ? "All agents active"
            : `${stats.totalAgents - stats.activeAgents} inactive`
        }
      />
      <StatCard
        label="Total Tickets"
        value={formatNumber(stats.totalTickets)}
        icon={TicketIcon}
        href="/tickets"
        caption={`${formatNumber(stats.ticketsThisMonth)} added this month`}
      />
      <StatCard
        label="Total Paid"
        value={stats.totalPaid}
        currency={stats.currency}
        tone="paid"
        icon={BadgeCheck}
        href="/tickets/paid"
        caption={`${collectionRate}% of everything billed`}
      />
      <StatCard
        label="Total Outstanding"
        value={stats.totalOutstanding}
        currency={stats.currency}
        tone="unpaid"
        icon={CircleDollarSign}
        href="/tickets/unpaid"
        caption={
          stats.overdueTickets > 0
            ? `${formatNumber(stats.overdueTickets)} ticket${stats.overdueTickets === 1 ? "" : "s"} overdue`
            : `${formatNumber(stats.unpaidTickets)} unpaid ticket${stats.unpaidTickets === 1 ? "" : "s"}`
        }
      />
    </div>
  );
}

async function TrendPanel() {
  const [trend, stats] = await Promise.all([getMonthlyTrend(6), getDashboardStats()]);
  const hasData = trend.some((point) => Number(point.billed) > 0 || Number(point.collected) > 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Billed vs collected</CardTitle>
          <CardDescription>Last six months</CardDescription>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <span className="flex items-center gap-1.5 text-navy-600">
            <span className="size-2 rounded-full bg-brand-600" aria-hidden /> Billed
          </span>
          <span className="flex items-center gap-1.5 text-navy-600">
            <span className="size-2 rounded-full bg-paid-600" aria-hidden /> Collected
          </span>
        </div>
      </CardHeader>
      {hasData ? (
        <TrendChart data={trend} currency={stats.currency} />
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="Not enough history yet"
          description="Once tickets and payments are recorded, the monthly trend appears here."
          compact
        />
      )}
    </Card>
  );
}

async function OutstandingPanel() {
  const [agents, stats] = await Promise.all([
    getTopOutstandingAgents(5),
    getDashboardStats(),
  ]);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Who owes A TO Z</CardTitle>
          <CardDescription>
            {formatMoney(stats.totalOutstanding, stats.currency)} outstanding in total
          </CardDescription>
        </div>
      </CardHeader>
      {agents.length > 0 ? (
        <>
          <div className="flex-1">
            <OutstandingByAgent agents={agents} currency={stats.currency} />
          </div>
          <div className="border-t border-hairline px-5 py-2.5">
            <Link
              href="/tickets/unpaid"
              className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              View all outstanding tickets <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </>
      ) : (
        <EmptyState
          icon={BadgeCheck}
          title="Everything is settled"
          description="No agent currently owes A TO Z money."
          compact
        />
      )}
    </Card>
  );
}

async function RecentTickets({ timezone }: { timezone: string }) {
  const [tickets, settings] = await Promise.all([getRecentTickets(8), getSettings()]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent tickets</CardTitle>
          <CardDescription>The eight most recently created tickets</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/tickets">
            All tickets <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <TicketTable
        tickets={tickets}
        timezone={timezone}
        warnDays={settings.outstandingWarnDays}
        criticalDays={settings.outstandingCriticalDays}
        empty={
          <EmptyState
            icon={Receipt}
            title="No tickets yet"
            description="Add an agent, then create their first ticket to start tracking balances."
            action={
              <Button asChild variant="brand" size="sm">
                <Link href="/agents">
                  <Plus /> Go to agents
                </Link>
              </Button>
            }
          />
        }
      />
    </Card>
  );
}
