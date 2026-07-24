"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Trophy,
  User,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LogoLink } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
};

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tests", href: "/tests", icon: ClipboardList },
  { label: "Roleplays", href: "/roleplays", icon: Video },
  { label: "Study", href: "/study", icon: BookOpen },
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Profile", href: "/profile", icon: User },
];

const officerNav: NavItem[] = [
  { label: "Grading", href: "/admin/grading", icon: GraduationCap, roles: ["officer", "advisor"] },
  { label: "Admin", href: "/admin", icon: LayoutDashboard, roles: ["officer", "advisor"] },
];

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98]",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center px-2",
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
}

function SidebarNav({
  role,
  collapsed,
  onNavigate,
}: {
  role: UserRole | null;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const visibleOfficer = officerNav.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {mainNav.map((item) => (
        <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
      {visibleOfficer.length > 0 ? (
        <>
          <Separator className="my-3" />
          {visibleOfficer.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </>
      ) : null}
    </nav>
  );
}

export function AppSidebar({
  role,
  collapsed,
  onToggleCollapse,
}: {
  role: UserRole | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/60 bg-card/95 backdrop-blur-md transition-[width] duration-200 md:flex",
        collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-border/60 px-4",
          collapsed && "justify-center px-2",
        )}
      >
        {collapsed ? (
          <Link href="/dashboard" className="flex items-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
              D
            </span>
          </Link>
        ) : (
          <LogoLink />
        )}
      </div>

      <SidebarNav role={role} collapsed={collapsed} />

      <div className="border-t border-border/60 p-3">
        <Button
          type="button"
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn("w-full", !collapsed && "justify-start")}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

export function MobileSidebar({ role }: { role: UserRole | null }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[var(--sidebar-width)] p-0">
        <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <LogoLink />
        </SheetHeader>
        <SidebarNav role={role} collapsed={false} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  return { collapsed, toggleCollapse };
}
