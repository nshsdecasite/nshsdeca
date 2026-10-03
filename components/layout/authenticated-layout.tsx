"use client";

import type { ReactNode } from "react";
import { AppNav } from "@/components/deca/app-nav";
import { useSessionFocus } from "@/components/layout/session-focus-context";
import type { UserRole } from "@/lib/auth/roles";

export function AuthenticatedLayout({
  children,
  displayName,
  gradeLabel,
  initials,
  role,
  unreadCount = 0,
}: {
  children: ReactNode;
  displayName: string;
  gradeLabel?: string;
  initials: string;
  role: UserRole | null;
  unreadCount?: number;
}) {
  const { isFocusMode } = useSessionFocus();

  if (isFocusMode) {
    return <div className="min-h-screen bg-ground">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-ground">
      <AppNav
        displayName={displayName}
        gradeLabel={gradeLabel}
        initials={initials}
        role={role}
        unreadCount={unreadCount}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
