"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";

const MAIN = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tests", label: "Tests" },
  { href: "/roleplays", label: "Roleplays" },
  { href: "/study", label: "Study" },
  { href: "/notes", label: "Notes" },
  { href: "/messages", label: "Messages" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

const OFFICER = [
  { href: "/admin/grading", label: "Grading" },
  { href: "/admin", label: "Admin" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  displayName,
  gradeLabel,
  role,
  unreadCount = 0,
}: {
  displayName: string;
  gradeLabel?: string;
  role: UserRole | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const showOfficer = role === "officer" || role === "advisor";

  return (
    <aside className="flex min-h-0 flex-col border-r border-edge bg-white">
      <div className="border-b border-edge px-6 py-5">
        <Link href="/dashboard" className="inline-flex text-ink hover:text-ink">
          <Logo className="no-outline h-[22px] w-auto" priority />
        </Link>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 py-4 text-[15px]">
        {MAIN.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-[6px] px-4 py-[11px] text-ink-2 transition-[background-color,color] duration-150 hover:bg-ever-lt hover:text-ever-dk",
                active && "bg-ever-lt text-ever-dk",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                {item.label}
                {item.href === "/messages" && unreadCount > 0 ? (
                  <span className="font-mono text-xs tabular text-ever">
                    {unreadCount}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
        {showOfficer
          ? OFFICER.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[6px] px-4 py-[11px] text-ink-2 transition-[background-color,color] duration-150 hover:bg-ever-lt hover:text-ever-dk",
                    active && "bg-ever-lt text-ever-dk",
                  )}
                >
                  {item.label}
                </Link>
              );
            })
          : null}
      </nav>

      <div className="mt-auto border-t border-edge px-6 py-5">
        <Link href="/profile" className="block text-[14px] text-ink hover:text-ink">
          {displayName}
        </Link>
        {gradeLabel ? (
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-mute">
            {gradeLabel}
          </p>
        ) : null}
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute transition-colors duration-150 hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

export function usesFullFrame(pathname: string) {
  return (
    pathname === "/roleplays" || /^\/admin\/grading\/[^/]+$/.test(pathname)
  );
}
