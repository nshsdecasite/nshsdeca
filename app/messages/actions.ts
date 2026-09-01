"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth/roles";
import type {
  DirectMessage,
  MessageConversation,
  MessageableMember,
} from "@/lib/platform/types";
import { createClient } from "@/lib/supabase/server";

export async function listMessageableMembers(): Promise<MessageableMember[]> {
  await requireAuth("/messages");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_messageable_members");
  if (error) throw new Error(error.message);
  return (data ?? []) as MessageableMember[];
}

export async function listMyConversations(): Promise<MessageConversation[]> {
  await requireAuth("/messages");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_conversations");
  if (error) throw new Error(error.message);
  return ((data ?? []) as MessageConversation[]).map((row) => ({
    ...row,
    unread_count: Number(row.unread_count),
  }));
}

export async function listConversationMessages(
  otherUserId: string,
): Promise<DirectMessage[]> {
  await requireAuth("/messages");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_conversation_messages", {
    p_other_user_id: otherUserId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as DirectMessage[];
}

export async function sendDirectMessage(recipientId: string, body: string) {
  await requireAuth("/messages");
  const text = body.trim();
  if (!text) throw new Error("Message is required");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_direct_message", {
    p_recipient_id: recipientId,
    p_body: text,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/messages");
}

export async function sendBroadcastMessage(audience: "students" | "all", body: string) {
  await requireRole(["officer", "advisor"], "/messages");
  const text = body.trim();
  if (!text) throw new Error("Message is required");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_broadcast_message", {
    p_audience: audience,
    p_body: text,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/messages");
}

export async function markConversationRead(otherUserId: string) {
  await requireAuth("/messages");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_other_user_id: otherUserId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/messages");
}

export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unread_message_count");
  if (error) return 0;
  return Number(data ?? 0);
}
