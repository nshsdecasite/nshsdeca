import type { Metadata } from "next";
import { listAnnouncements } from "@/app/admin/actions";
import {
  listConversationMessages,
  listMessageableMembers,
  listMyConversations,
} from "@/app/messages/actions";
import { ChapterInbox } from "@/components/platform/ChapterInbox";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
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

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        eyebrow="Chapter"
        title="Announcements & messages"
        description={
          role === "officer" || role === "advisor"
            ? "Post chapter announcements and message members from the same page."
            : "Chapter announcements and messages from officers and advisors."
        }
      />
      <ChapterInbox
        currentUserId={user.id}
        role={role}
        announcements={announcements}
        conversations={conversations}
        members={members}
        activeUserId={activeUserId}
        activeMessages={activeMessages}
      />
    </SocialPage>
  );
}
