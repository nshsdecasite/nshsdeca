import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Misc",
};

const METHODS = [
  { href: "/study/vocab", title: "Vocab" },
  { href: "/study/theories", title: "Theories" },
  { href: "/study/visuals", title: "Visuals" },
  { href: "/notes", title: "Notes" },
] as const;

export default async function StudyMiscPage() {
  await requireAuth("/study/misc");

  return (
    <div>
      <h1 className="font-display text-[40px] font-black tracking-[-0.04em] text-balance">
        Misc
      </h1>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {METHODS.map((method) => (
          <Link
            key={method.href}
            href={method.href}
            className="deca-card flex items-center justify-between gap-4 px-7 py-6 text-ink transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-ever-lt"
          >
            <span className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-balance">
              {method.title}
            </span>
            <span className="shrink-0 text-[13px] font-bold text-ever-dk">Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
