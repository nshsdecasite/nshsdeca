"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth/roles";
import type {
  AdminOverview,
  Announcement,
  AnnouncementReaction,
  AnnouncementReactionName,
  ChapterActivity,
  ChapterMember,
} from "@/lib/platform/types";
import { createClient } from "@/lib/supabase/server";

const REACTIONS = new Set<AnnouncementReactionName>([
  "like",
  "love",
  "laugh",
  "celebrate",
  "eyes",
]);

function asReactions(value: unknown): AnnouncementReaction[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { reaction?: unknown; count?: unknown; mine?: unknown };
    if (typeof row.reaction !== "string" || !REACTIONS.has(row.reaction as AnnouncementReactionName)) {
      return [];
    }
    return [{
      reaction: row.reaction as AnnouncementReactionName,
      count: Number(row.count) || 0,
      mine: Boolean(row.mine),
    }];
  });
}

export async function listAnnouncements(): Promise<Announcement[]> {
  await requireAuth("/messages");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_announcements");
  if (error) throw new Error(error.message);
  return ((data ?? []) as Announcement[]).map((announcement) => ({
    ...announcement,
    reactions: asReactions(announcement.reactions),
  }));
}

export async function toggleAnnouncementReaction(
  announcementId: string,
  reaction: AnnouncementReactionName,
) {
  await requireAuth("/messages");
  if (!REACTIONS.has(reaction)) throw new Error("Unknown reaction");
  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_announcement_reaction", {
    p_announcement_id: announcementId,
    p_reaction: reaction,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/messages");
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await requireRole(["officer", "advisor"], "/admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_overview");
  if (error) throw new Error(error.message);
  const overview = data as AdminOverview;
  return {
    ...overview,
    student_count: Number(overview.student_count ?? 0),
    pending_submissions: Number(overview.pending_submissions ?? 0),
    tests_this_week: Number(overview.tests_this_week ?? 0),
    tests_completed_total: Number(overview.tests_completed_total ?? 0),
    roleplays_submitted_total: Number(overview.roleplays_submitted_total ?? 0),
    roleplays_graded_total: Number(overview.roleplays_graded_total ?? 0),
    tab_blur_events_total: Number(overview.tab_blur_events_total ?? 0),
  };
}

export async function createAnnouncement(formData: FormData) {
  await requireRole(["officer", "advisor"], "/messages");
  const supabase = await createClient();
  const message = String(formData.get("message") ?? "").trim();
  const visibleTo = String(formData.get("visible_to") ?? "all");
  if (!message) throw new Error("Message is required");

  const { error } = await supabase.rpc("create_announcement", {
    p_message: message,
    p_visible_to: visibleTo,
    p_expires_at: null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/messages");
}

export async function listChapterActivity(): Promise<ChapterActivity[]> {
  await requireRole(["officer", "advisor"], "/admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_chapter_activity");
  if (error) throw new Error(error.message);
  return ((data ?? []) as ChapterActivity[]).map((row) => ({
    ...row,
    total_points: Number(row.total_points),
    tests_completed: Number(row.tests_completed),
    roleplays_submitted: Number(row.roleplays_submitted),
    roleplays_graded: Number(row.roleplays_graded),
    avg_test_pct: row.avg_test_pct != null ? Number(row.avg_test_pct) : null,
    avg_roleplay_score:
      row.avg_roleplay_score != null ? Number(row.avg_roleplay_score) : null,
    tab_blur_count: Number(row.tab_blur_count),
  }));
}

export async function listChapterMembers(): Promise<ChapterMember[]> {
  await requireRole(["officer", "advisor"], "/admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_chapter_members");
  if (error) throw new Error(error.message);
  return ((data ?? []) as ChapterMember[]).map((row) => ({
    ...row,
    total_points: Number(row.total_points),
  }));
}

export async function setMemberRole(userId: string, role: ChapterMember["role"]) {
  await requireRole(["officer", "advisor"], "/admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteAnnouncement(id: string) {
  await requireRole(["officer", "advisor"], "/messages");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_announcement", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/messages");
}
