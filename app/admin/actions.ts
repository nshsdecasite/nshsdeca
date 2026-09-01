"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import type {
  AdminOverview,
  Announcement,
  ChapterMember,
} from "@/lib/platform/types";
import { createClient } from "@/lib/supabase/server";

export async function listAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_announcements");
  if (error) throw new Error(error.message);
  return (data ?? []) as Announcement[];
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await requireRole(["officer", "advisor"], "/admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_overview");
  if (error) throw new Error(error.message);
  return data as AdminOverview;
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
