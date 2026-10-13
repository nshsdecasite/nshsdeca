import type { ReactNode } from "react";
import { DecaFrame } from "@/components/deca/frame";
import { RouteGhost } from "@/components/layout/route-ghost";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <DecaFrame>
      <RouteGhost>{children}</RouteGhost>
    </DecaFrame>
  );
}
