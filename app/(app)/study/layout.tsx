import type { ReactNode } from "react";
import { PiTabs, StudyTabs } from "@/components/deca/study-tabs";

export default function StudyLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <StudyTabs />
      <PiTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
