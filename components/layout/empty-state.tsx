import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <SocialPanel className="flex flex-col items-center px-6 py-12 text-center">
      <p className="text-[15px] font-semibold tracking-tight">{title}</p>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </SocialPanel>
  );
}

export function ComingSoonPage({
  title,
  description,
  backHref = "/dashboard",
  backLabel = "Dashboard",
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <SocialPage>
      <PageHeader
        backHref={backHref}
        backLabel={backLabel}
        eyebrow="Coming soon"
        title={title}
        description={description}
      />
      <EmptyState
        title="Not ready yet"
        description="This section is still being built. Everything else on the platform is live."
        action={
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </SocialPage>
  );
}
