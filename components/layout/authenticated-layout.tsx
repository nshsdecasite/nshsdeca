"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppNav, usesFullFrame } from "@/components/deca/app-nav";
import { DecaFrame } from "@/components/deca/frame";
import { useSessionFocus } from "@/components/layout/session-focus-context";
import type { UserRole } from "@/lib/auth/roles";

export function AuthenticatedLayout({
  children,
  displayName,
  gradeLabel,
  role,
  unreadCount = 0,
}: {
  children: ReactNode;
  displayName: string;
  gradeLabel?: string;
  role: UserRole | null;
  unreadCount?: number;
}) {
  const { isFocusMode } = useSessionFocus();
  const pathname = usePathname();
  const fullFrame = usesFullFrame(pathname);

  if (isFocusMode) {
    return <div className="min-h-screen bg-ground">{children}</div>;
  }

  if (fullFrame) {
    return <DecaFrame>{children}</DecaFrame>;
  }

  return (
    <DecaFrame innerClassName="grid min-h-[calc(100vh-96px)] grid-cols-[224px_minmax(0,1fr)]">
      <AppNav
        displayName={displayName}
        gradeLabel={gradeLabel}
        role={role}
        unreadCount={unreadCount}
      />
      <div className="min-w-0 bg-white">{children}</div>
    </DecaFrame>
  );
}
