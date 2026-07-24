"use client";

import { signOut } from "@/app/auth/actions";
import { MobileSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";

export function AppTopbar({
  firstName,
  role,
  className,
}: {
  firstName: string;
  role: UserRole | null;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-card/85 px-4 backdrop-blur-md sm:px-6",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <MobileSidebar role={role} />
        <p className="text-sm text-muted-foreground md:hidden">DECA Platform</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Hi, <span className="font-medium text-foreground">{firstName}</span>
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
