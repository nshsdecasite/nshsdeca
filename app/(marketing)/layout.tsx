import type { ReactNode } from "react";
import { DecaFrame } from "@/components/deca/frame";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <DecaFrame>{children}</DecaFrame>;
}
