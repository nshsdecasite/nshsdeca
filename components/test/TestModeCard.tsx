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
    <Card className="flex h-full flex-col p-6 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-border-hover">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {badge ? (
          <Badge>{badge}</Badge>
        ) : !live ? (
          <Badge variant="muted">Soon</Badge>
        ) : null}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span
        className={cn(
          "mt-5 inline-flex min-h-10 items-center text-sm font-medium",
          live ? "text-primary" : "text-muted-foreground",
        )}
      >
        {live ? "Open →" : "Coming soon"}
      </span>
    </Card>
  );

  if (!live) {
    return <div className="opacity-80">{body}</div>;
  }

  return (
    <Link href={href} className="block h-full active:scale-[0.98]">
      {body}
    </Link>
  );
}
