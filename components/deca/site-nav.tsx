import Link from "next/link";
import { Logo } from "@/components/logo";
import { DecaButton } from "@/components/deca/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Chapter", match: "chapter" },
  { href: "/#compete", label: "Compete", match: "compete" },
  { href: "/#coming-up", label: "Calendar", match: "calendar" },
  { href: "/login?next=/admin", label: "Officers", match: "officers" },
] as const;

export function SiteNav({
  active = "chapter",
}: {
  active?: "chapter" | "compete" | "calendar" | "officers" | "none";
}) {
  return (
    <header className="flex items-center justify-between border-b border-edge px-8 py-4">
      <Link
        href="/"
        className="inline-flex items-center text-ink hover:text-ink"
      >
        <Logo className="no-outline h-[26px] w-auto" priority />
      </Link>
      <nav className="flex items-center gap-8 text-[15px]">
        {NAV.map((item) => {
          const isActive = active === item.match;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "py-1.5 text-ink-2 transition-[box-shadow,color] duration-150 hover:text-ink hover:shadow-[inset_0_-2px_0_var(--color-edge)]",
                isActive &&
                  "text-ink shadow-[inset_0_-2px_0_var(--color-gold-br)] hover:text-ink hover:shadow-[inset_0_-2px_0_var(--color-gold-br)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <DecaButton href="/login" size="sm" className="ml-0">
          Sign in
        </DecaButton>
      </nav>
    </header>
  );
}
