import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { AuditAction, AuditEntity } from "@prisma/client";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { listAuditLogs } from "@/lib/services/audit";
import { listUsers } from "@/lib/services/users";
import { getSettings } from "@/lib/services/settings";
import { forbidden } from "@/lib/utils/errors";
import { normaliseSearchParams } from "@/lib/utils/request";
import { Card, CardFooter } from "@/components/ui/card";
import { Table, TBody, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import {
  ClearFiltersButton,
  DateRangeFilter,
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/shared/filter-bar";
import { AuditRow } from "@/components/activity/audit-row";
import { actionMeta } from "@/components/activity/audit-timeline";

export const metadata: Metadata = { title: "Activity log" };
export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser("/activity");
  if (!can(user.role, "audit:view")) throw forbidden();

  const query = normaliseSearchParams(await searchParams);

  const [page, settings, users] = await Promise.all([
    listAuditLogs(query),
    getSettings(),
    // Only administrators manage accounts, so only they get the user filter.
    can(user.role, "user:manage") ? listUsers() : Promise.resolve([]),
  ]);

  const isFiltered = Boolean(
    query.q || query.action || query.entityType || query.userId || query.from || query.to,
  );

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="Every agent, ticket, payment and account change, with who did it and when."
      />

      <Card>
        <FilterBar>
          <SearchInput
            placeholder="Search actions, PNRs or users…"
            className="w-full sm:w-72"
          />
          <FilterSelect
            paramKey="action"
            label="Action"
            allLabel="All actions"
            options={Object.values(AuditAction).map((action) => ({
              value: action,
              label: actionMeta(action).label,
            }))}
          />
          <FilterSelect
            paramKey="entityType"
            label="Record type"
            allLabel="All record types"
            options={Object.values(AuditEntity).map((entity) => ({
              value: entity,
              label: entity.charAt(0) + entity.slice(1).toLowerCase(),
            }))}
          />
          {users.length > 0 && (
            <FilterSelect
              paramKey="userId"
              label="User"
              allLabel="All users"
              options={users.map((item) => ({ value: item.id, label: item.name }))}
            />
          )}
          <DateRangeFilter />
          <ClearFiltersButton className="ml-auto" />
        </FilterBar>

        {page.items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={isFiltered ? "No activity matches those filters" : "No activity yet"}
            description={
              isFiltered
                ? "Try a different action, record type, user or date range."
                : "Actions are recorded here automatically as staff use the system."
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>When</TH>
                    <TH>Action</TH>
                    <TH>Details</TH>
                    <TH>User</TH>
                    <TH align="right">Changes</TH>
                  </TR>
                </THead>
                <TBody>
                  {page.items.map((entry) => (
                    <AuditRow key={entry.id} entry={entry} timezone={settings.timezone} />
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
                label="entries"
              />
            </CardFooter>
          </>
        )}
      </Card>

      <p className="mt-3 text-[12px] text-navy-400">
        The activity log is append-only. Entries cannot be edited or deleted from
        the application.
      </p>
    </>
  );
}
