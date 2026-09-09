"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Desktop: a fixed navy sidebar beside the content.
 * Mobile: the same nav in a slide-over drawer that closes on navigation.
 */
export function AppShell({
  user,
  agencyName,
  unpaidCount,
  children,
}: {
  user: SessionUser;
  agencyName: string;
  unpaidCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => setMobileOpen(false), [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-navy-900 lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4">
          <Brand agencyName={agencyName} />
        </div>
        <SidebarNav role={user.role} unpaidCount={unpaidCount} />
        <div className="shrink-0 border-t border-white/10 px-4 py-3">
          <p className="text-[11px] leading-relaxed text-navy-400">
            Internal management system.
            <br />
            Agents do not have access.
          </p>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-navy-950/60 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          // The panel stays mounted so it can animate, so the dialog role and
          // `inert` are toggled instead — otherwise a closed drawer would sit
          // in the accessibility tree and its links would still take tab focus.
          role={mobileOpen ? "dialog" : undefined}
          aria-modal={mobileOpen ? true : undefined}
          aria-label="Navigation"
          inert={!mobileOpen}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col bg-navy-900 shadow-2xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <Brand agencyName={agencyName} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-1.5 text-navy-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          </div>
          <SidebarNav
            role={user.role}
            unpaidCount={unpaidCount}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </div>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-surface/90 px-4 backdrop-blur-sm sm:px-6">
          <Button
            variant="ghost"
            size="iconSm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <UserMenu user={user} />
        </header>

        <main id="main-content" className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[100rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
