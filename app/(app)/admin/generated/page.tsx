import type { Metadata } from "next";
import Link from "next/link";
import { listPracticeReviewQueue } from "@/app/roleplay/scenario-actions";
import { GeneratedReviewCard } from "@/components/deca/generated-review-card";
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

      {queue.length === 0 ? (
        <p className="mt-10 text-[15px] leading-[1.6] text-ink-2">
          Nothing is waiting for review.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((item) => (
            <GeneratedReviewCard key={item.id} item={item} />
          ))}
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
