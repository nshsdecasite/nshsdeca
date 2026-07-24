import Link from "next/link";
import type { ReactNode } from "react";
import { SocialHeader } from "@/components/layout/social-ui";

type PageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function PageHeader(props: PageHeaderProps) {
  return <SocialHeader {...props} />;
}

export { Link };
