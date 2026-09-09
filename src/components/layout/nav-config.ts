import {
  Activity,
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  Plus,
  Receipt,
  Settings,
  Ticket,
  Users,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Extra prefixes that should also light this item up. */
  match?: string[];
  permission?: Permission;
  exact?: boolean;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Agents",
    items: [
      { label: "All Agents", href: "/agents", icon: Users, exact: true, match: ["/agents/"] },
      { label: "Add Agent", href: "/agents/new", icon: Plus, permission: "agent:create", exact: true },
    ],
  },
  {
    title: "Tickets",
    items: [
      { label: "All Tickets", href: "/tickets", icon: Ticket, exact: true, match: ["/tickets/"] },
      { label: "Unpaid Tickets", href: "/tickets/unpaid", icon: CircleDollarSign, exact: true },
      { label: "Paid Tickets", href: "/tickets/paid", icon: Receipt, exact: true },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Payments", href: "/payments", icon: CircleDollarSign, match: ["/payments/"] },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Activity Log", href: "/activity", icon: Activity, permission: "audit:view" },
      { label: "Settings", href: "/settings", icon: Settings, match: ["/settings/"] },
    ],
  },
];

/** Is `href` the active nav target for the current pathname? */
export function isNavActive(item: NavItem, pathname: string) {
  if (item.exact) {
    if (pathname === item.href) return true;
    // "All Tickets" stays lit on /tickets/:id but not on /tickets/unpaid.
    return (item.match ?? []).some(
      (prefix) =>
        pathname.startsWith(prefix) &&
        !NAV_SECTIONS.some((section) =>
          section.items.some(
            (other) => other.href !== item.href && other.href === pathname,
          ),
        ),
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
