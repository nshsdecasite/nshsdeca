import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageSize = "default" | "wide" | "narrow";

const WIDTH: Record<PageSize, string> = {
  default: "max-w-5xl",
  wide: "max-w-none",
  narrow: "max-w-xl",
};

export function SocialPage({
  size = "default",
  children,
  className,
}: {
  size?: PageSize;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-full pb-16", className)}>
      <div className={cn("relative mx-auto px-6 py-9 sm:px-9", WIDTH[size])}>
        {children}
      </div>
    </div>
  );
}

export function SocialHeader({
  backHref,
  backLabel = "Back",
  eyebrow,
  title,
  description,
  className,
}: {
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-8", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center text-[13px] font-bold text-ever-dk hover:text-ever"
        >
          ← {backLabel}
        </Link>
      ) : null}
      {eyebrow ? (
        <p className={cn("eyebrow", backHref ? "mt-3.5" : "")}>{eyebrow}</p>
      ) : null}
      <h1
        className={cn(
          "font-display text-[40px] font-black tracking-[-0.04em] text-ink",
          backHref || eyebrow ? "mt-2.5" : "",
        )}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-2.5 max-w-[46ch] text-sm leading-[1.65] text-ink-2">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function SocialPanel({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "deca-card p-[26px]",
        interactive && "transition-transform duration-150 hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
