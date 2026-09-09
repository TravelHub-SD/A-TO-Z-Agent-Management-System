import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { forbidden } from "@/lib/utils/errors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AgentForm } from "@/components/agents/agent-form";

export const metadata: Metadata = { title: "Add agent" };
export const dynamic = "force-dynamic";

export default async function NewAgentPage() {
  const user = await requirePageUser("/agents/new");
  if (!can(user.role, "agent:create")) throw forbidden();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add agent"
        description="Create a record for an external travel agent."
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: "Add agent" },
        ]}
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Agent details</CardTitle>
            <CardDescription>
              The agent code must be unique across the system.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <AgentForm canToggleActive={can(user.role, "agent:toggle-active")} />
        </CardContent>
      </Card>
    </div>
  );
}
