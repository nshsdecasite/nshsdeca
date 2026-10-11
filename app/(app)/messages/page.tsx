import type { Metadata } from "next";
import { listAnnouncements } from "@/app/admin/actions";
import {
  listConversationMessages,
  listMessageableMembers,
  listMyConversations,
} from "@/app/messages/actions";
import { ChapterInbox } from "@/components/platform/ChapterInbox";
import { getUserRole, requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Announcements & messages",
};

type MessagesPageProps = {
  searchParams: Promise<{ with?: string }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const user = await requireAuth("/messages");
  const params = await searchParams;
  const activeUserId = params.with?.trim() || null;

  const [role, announcements, conversations, members, activeMessages] =
    await Promise.all([
      getUserRole(user.id),
      listAnnouncements(),
      listMyConversations(),
      listMessageableMembers(),
      activeUserId ? listConversationMessages(activeUserId) : Promise.resolve([]),
    ]);

  const messageableMembers =
    role === "student" && conversations.length > 0
      ? members.filter((member) =>
          conversations.some((conversation) => conversation.user_id === member.id),
        )
      : members;

  return (
    <ChapterInbox
      currentUserId={user.id}
      role={role}
      announcements={announcements}
      conversations={conversations}
      members={messageableMembers}
      activeUserId={activeUserId}
      activeMessages={activeMessages}
    />
  );
}
