import { TicketStatus } from "@prisma/client";
import { requirePageUser } from "@/lib/auth/guard";
import { getSettings } from "@/lib/services/settings";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

/**
 * Every internal page renders inside this layout, so the session check here
 * covers the whole application in addition to the edge middleware.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, settings, unpaidCount] = await Promise.all([
    requirePageUser(),
    getSettings(),
    prisma.ticket.count({ where: { status: TicketStatus.UNPAID } }),
  ]);

  return (
    <AppShell user={user} agencyName={settings.agencyName} unpaidCount={unpaidCount}>
      {children}
    </AppShell>
  );
}
