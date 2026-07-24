"use client";

import type { ReactNode } from "react";
import { AppSidebar, useSidebarCollapsed } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { useSessionFocus } from "@/components/layout/session-focus-context";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";

export function AuthenticatedLayout({
  children,
  firstName,
  role,
}: {
  children: ReactNode;
  firstName: string;
  role: UserRole | null;
}) {
  const { collapsed, toggleCollapse } = useSidebarCollapsed();
  const { isFocusMode } = useSessionFocus();

  return (
    <div className="min-h-screen">
      {!isFocusMode ? (
        <>
          <AppSidebar role={role} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
          <div
            className={cn(
              "flex min-h-screen flex-col transition-[margin-left] duration-200",
              collapsed
                ? "md:ml-[var(--sidebar-width-collapsed)]"
                : "md:ml-[var(--sidebar-width)]",
            )}
          >
            <AppTopbar firstName={firstName} role={role} />
            <div className="flex-1">{children}</div>
          </div>
        </>
      ) : (
        <div className="min-h-screen">{children}</div>
      )}
    </div>
  );
}
