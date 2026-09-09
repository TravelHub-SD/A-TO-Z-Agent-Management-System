"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, ShieldCheck, User as UserIcon } from "lucide-react";
import { Role } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/utils/api-client";
import type { SessionUser } from "@/lib/auth/session";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const toast = useToast();
  const [signingOut, setSigningOut] = React.useState(false);

  const signOut = async () => {
    setSigningOut(true);
    const result = await apiRequest("/api/auth/logout", { method: "POST" });
    if (!result.ok) {
      setSigningOut(false);
      toast.error("Could not sign out", result.message);
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-navy-100">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[12px] font-semibold text-white">
          {initials(user.name) || "AZ"}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[10rem] truncate text-[13px] font-medium leading-tight text-navy-900">
            {user.name}
          </span>
          <span className="block text-[11.5px] leading-tight text-navy-500">
            {user.role === Role.ADMIN ? "Administrator" : "Staff"}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-navy-400" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[14rem]">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <p className="truncate text-[13px] font-medium text-navy-900">{user.name}</p>
          <p className="truncate text-[12px] text-navy-500">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        {user.role === Role.ADMIN && (
          <DropdownMenuItem asChild>
            <Link href="/settings/users">
              <ShieldCheck /> Manage users
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <UserIcon /> My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut /> {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
