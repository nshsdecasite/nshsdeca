"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { useNavIntent } from "@/components/deca/page-ghost";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";

const MAIN = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/roleplays", label: "Roleplays" },
  { href: "/study", label: "Study" },
  { href: "/submissions", label: "Submissions" },
  { href: "/messages", label: "Messages" },
] as const;

const OFFICER = [
  { href: "/admin/grading", label: "Grading" },
  { href: "/admin/generated", label: "Reviews" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin", label: "Admin" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin") return pathname === href;
  if (href === "/roleplays") {
    return pathname.startsWith("/roleplays") || pathname.startsWith("/generate");
  }
  if (href === "/study") {
    return (
      pathname.startsWith("/study") ||
      pathname.startsWith("/tests") ||
      pathname === "/notes" ||
      pathname.startsWith("/notes/")
    );
  }
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
  const intent = useNavIntent();
  const currentPath = intent ?? pathname;
  const showOfficer = role === "officer" || role === "advisor";

  const pillPad = showOfficer ? "px-3" : "px-[18px]";

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-white print:hidden">
      <div
        className={cn(
          "mx-auto flex w-full items-center justify-between gap-4 px-5 py-[18px] sm:px-8",
          showOfficer ? "lg:max-w-[1440px]" : "lg:w-[70%] lg:max-w-[1100px] lg:gap-6 lg:px-0",
        )}
      >
        <Link
          href="/dashboard"
          className="inline-flex flex-none items-center text-ink transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:text-ink active:scale-[0.96]"
        >
          <Logo className="no-outline h-[2.55rem] w-auto" priority />
        </Link>

        <nav className="flex min-w-0 flex-1 items-center overflow-x-auto [justify-content:safe_center]">
          <div className="flex w-max gap-1 rounded-full bg-ground p-1.5 text-sm font-semibold">
            {MAIN.map((item) => {
              const active = isActive(currentPath, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-[7px] rounded-full py-2 whitespace-nowrap text-[#4b463c] transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:text-ever-dk",
                    pillPad,
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
                  const active = isActive(currentPath, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "rounded-full py-2 whitespace-nowrap text-[#4b463c] transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:text-ever-dk",
                        pillPad,
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
      </div>
    </header>
  );
}

export function usesFullFrame(_pathname: string) {
  return true;
}
