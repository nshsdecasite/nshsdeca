import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageSize = "default" | "wide" | "narrow";

const WIDTH: Record<PageSize, string> = {
  default: "max-w-5xl",
  wide: "max-w-6xl",
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
      <div className={cn("relative mx-auto px-4 py-8 sm:px-6 sm:py-10", WIDTH[size])}>
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
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 transition-colors duration-150 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      ) : null}
      {eyebrow ? (
        <p className={cn("eyebrow", backHref ? "mt-3" : "")}>{eyebrow}</p>
      ) : null}
      <h1
        className={cn(
          "font-display text-[32px] font-extrabold tracking-[-0.03em] text-ink sm:text-[40px]",
          backHref || eyebrow ? "mt-1.5" : "",
        )}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-[46ch] text-sm leading-[1.65] text-ink-2 sm:text-[15px]">
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
        "overflow-hidden rounded-[6px] border border-edge bg-white p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
