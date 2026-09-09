import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, User as UserIcon } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { getSettings } from "@/lib/services/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requirePageUser("/settings");
  const settings = await getSettings();
  const canManage = can(user.role, "settings:manage");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Settings"
        description="Agency configuration for currency, timezone and outstanding-balance thresholds."
        actions={
          canManage && (
            <Button asChild variant="outline">
              <Link href="/settings/users">
                <ShieldCheck /> Manage users
              </Link>
            </Button>
          )
        }
      />

      {!canManage && (
        <Alert tone="info" className="mb-5">
          Only administrators can change system settings. You can review the
          current configuration below.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Agency configuration</CardTitle>
            <CardDescription>
              Last updated {formatDateTime(settings.updatedAt, settings.timezone)}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} readOnly={!canManage} />
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <div>
            <CardTitle>Your account</CardTitle>
            <CardDescription>
              Signed in as {user.email} ·{" "}
              {user.role === "ADMIN" ? "Administrator" : "Staff"}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/profile">
              <UserIcon /> Change password
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <div>
            <CardTitle>About this system</CardTitle>
            <CardDescription>
              A TO Z — Agent Management System, version 1
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-[13px] leading-relaxed text-navy-600">
          <p>
            This is an internal platform. External travel agents do not have
            accounts and cannot sign in — A TO Z staff record every ticket,
            balance and payment on their behalf.
          </p>
          <p>
            A payment is recorded against a ticket with a 4-digit transaction
            number. Payments always match the full ticket amount; partial
            payments are not supported in version 1.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
