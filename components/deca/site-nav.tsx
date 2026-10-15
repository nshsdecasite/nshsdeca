import Link from "next/link";
import { Logo } from "@/components/logo";
import { DecaButton } from "@/components/deca/button";

export function SiteNav({
  active = "program",
  logoClassName = "no-outline h-[2.125rem] w-auto sm:h-[2.3375rem]",
}: {
  active?: "program" | "events" | "none";
  logoClassName?: string;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-10 py-5">
      <Link href="/" className="inline-flex items-center text-ink hover:text-ink">
        <Logo className={logoClassName} priority />
      </Link>

      <DecaButton
        href={active === "events" ? "/login?next=/calendar" : "/login"}
        size="sm"
      >
        Sign in
      </DecaButton>
    </header>
  );
}
