"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/study/pis",
    label: "Performance indicators (PIs)",
    active: (path: string) =>
      path === "/study" ||
      path.startsWith("/study/pis") ||
      path.startsWith("/study/flashcards"),
  },
  {
    href: "/study/exams",
    label: "Exams",
    active: (path: string) => path.startsWith("/study/exams"),
  },
  {
    href: "/study/misc",
    label: "Misc",
    active: (path: string) =>
      path.startsWith("/study/misc") ||
      path.startsWith("/study/vocab") ||
      path.startsWith("/study/theories") ||
      path.startsWith("/study/visuals"),
  },
] as const;

const PI_TABS = [
  {
    href: "/study/pis",
    label: "PI browser",
    active: (path: string) =>
      path === "/study" || path.startsWith("/study/pis"),
  },
  {
    href: "/study/flashcards",
    label: "PI flashcards",
    active: (path: string) => path.startsWith("/study/flashcards"),
  },
] as const;

export function PiTabs() {
  const pathname = usePathname();
  const inPi =
    pathname === "/study" ||
    pathname.startsWith("/study/pis") ||
    pathname.startsWith("/study/flashcards");
  if (!inPi) return null;

  return (
    <div className="mt-3 overflow-x-auto">
      <div
        role="tablist"
        aria-label="Performance indicators"
        className="flex w-max gap-1 border-b border-edge"
      >
        {PI_TABS.map((tab) => {
          const selected = tab.active(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={selected}
              className={cn(
                "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-[#4b463c] transition-colors duration-150 hover:text-ever-dk",
                selected && "border-ever-dk font-bold text-ever-dk",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function StudyTabs() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto">
      <div
        role="tablist"
        aria-label="Study"
        className="flex w-max gap-1 rounded-full bg-ground p-1.5 text-sm font-semibold"
      >
        {TABS.map((tab) => {
          const selected = tab.active(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={selected}
              className={cn(
                "flex min-h-10 items-center rounded-full px-[18px] py-2 whitespace-nowrap text-[#4b463c] transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:text-ever-dk",
                selected && "bg-ever-dk font-bold text-white hover:text-white",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
