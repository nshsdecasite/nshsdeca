"use client";

import { signOut } from "@/app/auth/actions";
import { MobileSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";

export function AppTopbar({
  firstName,
  role,
  unreadCount = 0,
  className,
}: {
  firstName: string;
  role: UserRole | null;
  unreadCount?: number;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between gap-4 bg-background/80 px-4 backdrop-blur-md sm:px-6",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <MobileSidebar role={role} unreadCount={unreadCount} />
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-[13px] text-muted-foreground sm:inline">
          {firstName}
        </span>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
