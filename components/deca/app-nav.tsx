"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";

const MAIN = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/roleplays", label: "Roleplays" },
  { href: "/submissions", label: "Submissions" },
  { href: "/study", label: "Study" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/messages", label: "Messages" },
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
  initials,
  role,
  unreadCount = 0,
}: {
  displayName: string;
  gradeLabel?: string;
  initials: string;
  role: UserRole | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const showOfficer = role === "officer" || role === "advisor";

  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-6 border-b border-edge bg-white px-6 py-[18px] lg:px-9">
      <Link href="/dashboard" className="inline-flex flex-none text-ink hover:text-ink">
        <Logo className="no-outline h-[22px] w-auto" priority />
      </Link>

      <nav className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto">
        <div className="flex gap-1 rounded-full bg-ground p-1.5 text-sm font-semibold">
          {MAIN.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-[7px] rounded-full px-[18px] py-2 whitespace-nowrap text-[#4b463c] transition-colors duration-150 hover:text-ever-dk",
                  active && "bg-ever-dk font-bold text-white hover:text-white",
                )}
              >
                {item.label}
                {item.href === "/messages" && unreadCount > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-[7px] py-px text-[11px] font-extrabold",
                      active ? "bg-white text-ever-dk" : "bg-ever text-white",
                    )}
                  >
                    {unreadCount}
                  </span>
                ) : null}
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
                      "rounded-full px-[18px] py-2 whitespace-nowrap text-[#4b463c] transition-colors duration-150 hover:text-ever-dk",
                      active && "bg-ever-dk font-bold text-white hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })
            : null}
        </div>
      </nav>

      <div className="flex flex-none items-center gap-3">
        <div className="hidden text-right sm:block">
          <Link href="/profile" className="block text-[13px] font-bold text-ink hover:text-ink">
            {displayName}
          </Link>
          {gradeLabel ? (
            <p className="mt-0.5 text-[11px] text-mute">{gradeLabel}</p>
          ) : null}
          <form action={signOut}>
            <button
              type="submit"
              className="text-[11px] font-bold text-mute transition-colors duration-150 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ever-lt text-sm font-extrabold text-ever-dk hover:text-ever-dk"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}

export function usesFullFrame(_pathname: string) {
  return true;
}
