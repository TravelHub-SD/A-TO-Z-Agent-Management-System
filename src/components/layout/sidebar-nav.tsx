"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { NAV_SECTIONS, isNavActive } from "@/components/layout/nav-config";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

/**
 * Navigation is filtered by capability, so a STAFF user never sees a link to
 * something they would be refused. The server re-checks on every request.
 */
export function SidebarNav({
  role,
  onNavigate,
  unpaidCount,
}: {
  role: Role;
  onNavigate?: () => void;
  unpaidCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAV_SECTIONS.map((section, index) => {
        const items = section.items.filter(
          (item) => !item.permission || can(role, item.permission),
        );
        if (items.length === 0) return null;

        return (
          <div key={section.title ?? `section-${index}`}>
            {section.title && (
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-navy-400">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isNavActive(item, pathname);
                const Icon = item.icon;
                const showBadge =
                  item.href === "/tickets/unpaid" && (unpaidCount ?? 0) > 0;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                        active
                          ? "bg-white/10 text-white"
                          : "text-navy-200 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active ? "text-brand-300" : "text-navy-400 group-hover:text-navy-200",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{item.label}</span>
                      {showBadge && (
                        <span className="tabular ml-auto rounded-full bg-unpaid-500/20 px-1.5 py-px text-[11px] font-semibold text-unpaid-200">
                          {unpaidCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
