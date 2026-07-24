import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SocialPageSize = "default" | "wide" | "narrow";

const SHELL_WIDTH: Record<SocialPageSize, string> = {
  default: "max-w-5xl",
  wide: "max-w-7xl",
  narrow: "max-w-3xl",
};

export function SocialPage({
  size = "default",
  children,
  className,
}: {
  size?: SocialPageSize;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("social-page min-h-full pb-12", className)}>
      <div className="social-page-glow pointer-events-none" aria-hidden />
      <div className={cn("social-page-shell relative", SHELL_WIDTH[size])}>
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
          className="text-sm font-medium text-primary transition-colors hover:text-primary"
        >
          ← {backLabel}
        </Link>
      ) : null}
      {eyebrow ? (
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.14em] text-primary",
            backHref ? "mt-3" : "",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          "text-3xl font-bold tracking-tight text-foreground sm:text-4xl",
          backHref || eyebrow ? "mt-2" : "",
        )}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
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
        "rounded-2xl border border-border/60 bg-card p-5 shadow-border sm:p-6",
        interactive &&
          "transition-[box-shadow,transform] duration-150 hover:shadow-border-hover active:scale-[0.995]",
        className,
      )}
    >
      {children}
    </div>
  );
}
