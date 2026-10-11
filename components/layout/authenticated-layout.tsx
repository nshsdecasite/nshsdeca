"use client";

import type { ReactNode } from "react";
import { AppNav } from "@/components/deca/app-nav";
import { useSessionFocus } from "@/components/layout/session-focus-context";
import type { UserRole } from "@/lib/auth/roles";

const CONTENT =
  "mx-auto w-full px-5 py-8 sm:px-8 lg:w-[70%] lg:max-w-[1100px] lg:px-0 lg:py-10";

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
    return (
      <div className="min-h-screen bg-ground">
        <div className={CONTENT}>{children}</div>
      </div>
    );
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
      <main className={CONTENT}>{children}</main>
    </div>
  );
}
