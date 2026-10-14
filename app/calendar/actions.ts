"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import type { ChapterEvent } from "@/lib/platform/types";
import { createClient } from "@/lib/supabase/server";

function parseTimestamp(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid date and time.");
  }
  return date.toISOString();
}

export async function listUpcomingChapterEvents(): Promise<ChapterEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_chapter_events");
  if (error) return [];
  return (data ?? []) as ChapterEvent[];
}

export async function listAllChapterEvents(): Promise<ChapterEvent[]> {
  await requireRole(["officer", "advisor"], "/admin/calendar");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_all_chapter_events");
  if (error) return [];
  return (data ?? []) as ChapterEvent[];
}

export async function createChapterEvent(formData: FormData) {
  await requireRole(["officer", "advisor"], "/admin/calendar");
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsAt = parseTimestamp(formData.get("starts_at"));
  const endsAt = parseTimestamp(formData.get("ends_at"));

  if (!title) throw new Error("Title is required.");
  if (!startsAt) throw new Error("Start time is required.");
  if (endsAt && new Date(endsAt) < new Date(startsAt)) {
    throw new Error("End time must be after the start time.");
  }

  const { error } = await supabase.rpc("create_chapter_event", {
    p_title: title,
    p_detail: detail || null,
    p_location: location || null,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/admin/calendar");
}

export async function deleteChapterEvent(id: string) {
  await requireRole(["officer", "advisor"], "/admin/calendar");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_chapter_event", { p_id: id });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/admin/calendar");
}
