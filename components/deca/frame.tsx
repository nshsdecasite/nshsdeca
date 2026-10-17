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
    <div className={cn("min-h-screen bg-ground px-3 py-3 text-ink sm:px-6 sm:py-6 lg:px-10", className)}>
      <div
        className={cn(
          "mx-auto min-h-[calc(100vh-1.5rem)] w-full max-w-[1440px] overflow-hidden rounded-[20px] bg-ground sm:min-h-[calc(100vh-3rem)] sm:rounded-[28px]",
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
    <div className={cn("deca-card overflow-hidden", className)}>
      {children}
    </div>
  );
}
