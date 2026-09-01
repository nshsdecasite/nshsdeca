import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TestModeCardProps = {
  title: string;
  description: string;
  href: string;
  badge?: string;
  live?: boolean;
};

export function TestModeCard({
  title,
  description,
  href,
  badge,
  live = true,
}: TestModeCardProps) {
  const body = (
    <Card className="flex h-full flex-col p-5 transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {!live ? <Badge variant="muted">Coming soon</Badge> : badge ? <Badge>{badge}</Badge> : null}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span
        className={cn(
          "mt-4 inline-flex min-h-10 items-center text-sm font-medium",
          live ? "text-primary" : "text-muted-foreground",
        )}
      >
        {live ? "Open" : "Coming soon"}
      </span>
    </Card>
  );

  if (!live) return body;

  return (
    <Link
      href={href}
      className="block h-full transition-transform duration-150 ease-out active:scale-[0.96]"
    >
      {body}
    </Link>
  );
}
