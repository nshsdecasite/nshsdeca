import Link from "next/link";
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
    <div className="deca-card flex h-full flex-col px-7 py-[26px]">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
          {title}
        </h2>
        {!live ? (
          <span className="rounded-full bg-ground px-3 py-1 text-[11px] font-extrabold text-mute">
            Coming soon
          </span>
        ) : badge ? (
          <span className="rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-ink-2">{description}</p>
      <span
        className={cn(
          "mt-4 inline-flex text-[13px] font-bold",
          live ? "text-ever-dk" : "text-mute",
        )}
      >
        {live ? "Open" : "Coming soon"}
      </span>
    </div>
  );

  if (!live) return body;

  return (
    <Link href={href} className="block h-full text-ink hover:text-ink">
      {body}
    </Link>
  );
}
