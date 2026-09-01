"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LeaderboardEntry } from "@/lib/platform/types";
import { displayName } from "@/lib/auth/display-name";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

type LeaderboardBoardProps = {
  allTime: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  currentUserId?: string;
};

export function LeaderboardBoard({
  allTime,
  weekly,
  currentUserId,
}: LeaderboardBoardProps) {
  const [view, setView] = useState<"all" | "week">("all");
  const entries = view === "all" ? allTime : weekly;

  const tabs = useMemo(
    () => [
      { id: "all" as const, label: "All time" },
      { id: "week" as const, label: "This week" },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={view === tab.id ? "default" : "secondary"}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title={view === "week" ? "No points this week" : "No rankings yet"}
          description={
            view === "week"
              ? "Complete a practice test or flashcard set this week to appear here."
              : "Complete a practice test or flashcard set to start earning points for the chapter leaderboard."
          }
          action={
            <Button asChild>
              <Link href="/tests">Start a test</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Grade</th>
                <th className="px-5 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isMe = entry.user_id === currentUserId;
                return (
                  <tr
                    key={entry.user_id}
                    className={isMe ? "bg-primary/10" : "border-t border-border/60"}
                  >
                    <td className="px-5 py-4 font-semibold tabular-nums text-foreground">
                      #{entry.rank}
                    </td>
                    <td className="px-5 py-4 font-medium text-foreground">
                      {displayName(entry.first_name, entry.last_name)}
                      {isMe ? (
                        <span className="ml-2 text-xs font-semibold text-primary">You</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-muted-foreground">
                      {entry.grade_level ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-primary">
                      {entry.total_points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
