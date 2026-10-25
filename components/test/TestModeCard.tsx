import Link from "next/link";
import { cn } from "@/lib/utils";

type TestModeCardProps = {
  title: string;
  description?: string;
  href: string;
  badge?: string;
  live?: boolean;
  locked?: boolean;
};

export function TestModeCard({
  title,
  description,
  href,
  badge,
  live = true,
  locked = false,
}: TestModeCardProps) {
  const open = live && !locked;
  const body = (
    <div className="deca-card flex h-full flex-col px-7 py-[26px]">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
          {title}
        </h2>
        {locked ? (
          <span className="rounded-full bg-ground px-3 py-1 text-[11px] font-extrabold text-mute">
            Locked
          </span>
        ) : !live ? (
          <span className="rounded-full bg-ground px-3 py-1 text-[11px] font-extrabold text-mute">
            Coming soon
          </span>
        ) : badge ? (
          <span className="rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
            {badge}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="flex-1 text-sm leading-relaxed text-ink-2">{description}</p>
      ) : null}
      <span
        className={cn(
          "mt-4 inline-flex text-[13px] font-bold",
          open ? "text-ever-dk" : "text-mute",
        )}
      >
        {locked ? "Locked" : live ? "Open" : "Coming soon"}
      </span>
    </div>
  );

  if (!open) return body;

  return (
    <Link href={href} className="block h-full text-ink hover:text-ink">
      {body}
    </Link>
  );
}
