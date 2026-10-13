"use client";

import { PageGhost, peekGhostPath } from "@/components/deca/page-ghost";
import { usePathname } from "next/navigation";

export default function Loading() {
  const pathname = usePathname();
  return <PageGhost path={peekGhostPath() ?? pathname} />;
}
