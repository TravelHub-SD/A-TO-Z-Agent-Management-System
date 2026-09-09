import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryList, SummaryRow } from "@/components/shared/summary-row";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export const metadata: Metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requirePageUser("/settings/profile");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="My profile"
        description="Your account details and password."
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "My profile" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="py-1">
          <SummaryList>
            <SummaryRow label="Name">{user.name}</SummaryRow>
            <SummaryRow label="Email">{user.email}</SummaryRow>
            <SummaryRow label="Role">
              <Badge variant={user.role === "ADMIN" ? "brand" : "neutral"} size="sm">
                {user.role === "ADMIN" ? "Administrator" : "Staff"}
              </Badge>
            </SummaryRow>
          </SummaryList>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <div>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Only an administrator can change your name, email or role.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
