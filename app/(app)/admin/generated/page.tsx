import type { Metadata } from "next";
import Link from "next/link";
import { listPracticeReviewQueue } from "@/app/roleplay/scenario-actions";
import { DecaButton } from "@/components/deca/button";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Generated roleplay reviews",
};

export default async function GeneratedReviewPage() {
  await requireRole(["officer", "advisor"], "/admin/generated");
  const queue = await listPracticeReviewQueue();

  return (
    <div>
      <h1 className="text-balance font-display text-[40px] font-black tracking-[-0.04em]">
        Generated reviews
      </h1>
      <p className="mt-2.5 max-w-2xl text-pretty text-sm leading-6 text-ink-2">
        Members can send a practice event here when they think it is strong enough for officers to look at.
        It stays off the public library.
      </p>

      {queue.length === 0 ? (
        <p className="mt-10 text-[15px] leading-[1.6] text-ink-2">
          Nothing is waiting for review.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((item) => {
            const title =
              item.scenario_title?.trim() || `${item.event_code} practice event`;
            return (
              <div key={item.id} className="deca-card flex flex-col px-7 py-[26px]">
                <span className="w-fit rounded-full bg-gold-lt px-3 py-1 text-[11px] font-extrabold text-gold">
                  {item.event_code} · {item.year}
                </span>
                <h2 className="mt-4 font-display text-xl font-extrabold tracking-[-0.02em] text-balance">
                  {title}
                </h2>
                <p className="mt-2 mb-5 flex-1 text-pretty text-[13px] leading-[1.55] text-ink-2 line-clamp-4">
                  {item.preview?.trim() || item.event_name}
                </p>
                <p className="mb-4 text-[12px] font-bold text-mute">
                  {item.creator_name ? `From ${item.creator_name}` : "Submitted by a member"}
                </p>
                <DecaButton
                  href={`/roleplays/${item.id}`}
                  variant="tint"
                  size="sm"
                  className="mt-auto self-start"
                >
                  Open
                </DecaButton>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/admin"
        className="mt-8 inline-block text-[13px] font-bold text-ever-dk hover:text-ever"
      >
        Back to admin
      </Link>
    </div>
  );
}
