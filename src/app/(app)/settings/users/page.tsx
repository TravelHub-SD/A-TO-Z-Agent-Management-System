import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { listUsers } from "@/lib/services/users";
import { getSettings } from "@/lib/services/settings";
import { forbidden } from "@/lib/utils/errors";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import { UserManager } from "@/components/settings/user-manager";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requirePageUser("/settings/users");
  if (!can(user.role, "user:manage")) throw forbidden("Administrator access required.");

  const [users, settings] = await Promise.all([listUsers(), getSettings()]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Users"
        description="Internal A TO Z staff accounts. There is no public registration."
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Users" }]}
      />

      <Alert tone="info" className="mb-5" title="Roles">
        <p className="mt-0.5">
          <strong>Administrators</strong> have full access, including user
          management, system settings, agent deactivation, ticket deletion and
          payment reversal. <strong>Staff</strong> can manage agents and tickets
          and record payments, and can read reports and the activity log.
        </p>
      </Alert>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>
              {users.length} account{users.length === 1 ? "" : "s"} ·{" "}
              {users.filter((item) => item.isActive).length} active
            </CardDescription>
          </div>
        </CardHeader>
        <UserManager users={users} currentUserId={user.id} timezone={settings.timezone} />
      </Card>
    </div>
  );
}
