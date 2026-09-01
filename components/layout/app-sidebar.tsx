"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
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
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Profile", href: "/profile", icon: User },
];

const officerNav: NavItem[] = [
  { label: "Grading", href: "/admin/grading", icon: GraduationCap, roles: ["officer", "advisor"] },
  { label: "Admin", href: "/admin", icon: Settings, roles: ["officer", "advisor"] },
];

function NavLink({
  item,
  collapsed,
  onNavigate,
  badge,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
  badge?: number;
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
        "group flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]",
        active
          ? "bg-primary/8 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="relative">
        <Icon className="h-4 w-4 shrink-0" />
        {collapsed && badge ? (
          <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-primary" />
        ) : null}
      </span>
      {!collapsed ? <span className="flex-1">{item.label}</span> : null}
      {!collapsed && badge ? (
        <span className="tabular-nums text-[11px] font-semibold text-primary">{badge}</span>
      ) : null}
    </Link>
  );
}

function SidebarNav({
  role,
  collapsed,
  onNavigate,
  unreadCount = 0,
}: {
  role: UserRole | null;
  collapsed: boolean;
  onNavigate?: () => void;
  unreadCount?: number;
}) {
  const visibleOfficer = officerNav.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
      {mainNav.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          onNavigate={onNavigate}
          badge={item.href === "/messages" ? unreadCount : undefined}
        />
      ))}
      {visibleOfficer.length > 0 ? (
        <>
          <Separator className="my-2" />
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
  unreadCount = 0,
}: {
  role: UserRole | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadCount?: number;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col bg-card shadow-border transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center px-3",
          collapsed && "justify-center px-2",
        )}
      >
        {collapsed ? (
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground"
          >
            D
          </Link>
        ) : (
          <LogoLink href="/dashboard" />
        )}
      </div>

      <SidebarNav role={role} collapsed={collapsed} unreadCount={unreadCount} />

      <div className="p-2">
        <Button
          type="button"
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={cn("w-full", !collapsed && "justify-start")}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

export function MobileSidebar({
  role,
  unreadCount = 0,
}: {
  role: UserRole | null;
  unreadCount?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[var(--sidebar-width)] p-0">
        <SheetHeader className="px-4 py-4 text-left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <LogoLink href="/dashboard" />
        </SheetHeader>
        <SidebarNav
          role={role}
          collapsed={false}
          onNavigate={() => setOpen(false)}
          unreadCount={unreadCount}
        />
      </SheetContent>
    </Sheet>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
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
