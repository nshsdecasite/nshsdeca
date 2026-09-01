import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DecaFrame({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-ground px-10 py-12 text-ink", className)}>
      <div
        className={cn(
          "mx-auto w-full max-w-[1440px] overflow-hidden rounded-[6px] border border-edge bg-white",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DecaPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[6px] border border-edge bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
