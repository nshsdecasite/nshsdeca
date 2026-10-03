import Link from "next/link";
import { Logo } from "@/components/logo";
import { DecaButton } from "@/components/deca/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Program", match: "program" },
  { href: "/events", label: "Events", match: "events" },
] as const;

export function SiteNav({
  active = "program",
  logoClassName = "no-outline h-[2.125rem] w-auto sm:h-[2.3375rem]",
}: {
  active?: "program" | "events" | "none";
  logoClassName?: string;
}) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-10 py-5">
      <Link href="/" className="inline-flex items-center text-ink hover:text-ink">
        <Logo className={logoClassName} priority />
      </Link>

      <nav className="hidden items-center gap-1.5 rounded-full bg-white p-1.5 text-sm font-semibold shadow-card md:flex">
        {NAV.map((item) => {
          const isActive = active === item.match;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "rounded-full px-[18px] py-2 text-[#4b463c] transition-colors duration-150 hover:text-ever-dk",
                isActive && "bg-ever-lt text-ever-dk hover:text-ever-dk",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-end">
        <DecaButton href="/login" size="sm">
          Sign in
        </DecaButton>
      </div>
    </header>
  );
}
