"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncement, deleteAnnouncement } from "@/app/admin/actions";
import {
  markConversationRead,
  sendBroadcastMessage,
  sendDirectMessage,
} from "@/app/messages/actions";
import { displayName } from "@/lib/auth/display-name";
import type { UserRole } from "@/lib/auth/roles";
import type {
  Announcement,
  DirectMessage,
  MessageConversation,
  MessageableMember,
} from "@/lib/platform/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SocialPanel } from "@/components/layout/social-ui";
import { cn } from "@/lib/utils";

type ChapterInboxProps = {
  currentUserId: string;
  role: UserRole | null;
  announcements: Announcement[];
  conversations: MessageConversation[];
  members: MessageableMember[];
  activeUserId: string | null;
  activeMessages: DirectMessage[];
};

const VISIBILITY_LABEL: Record<string, string> = {
  all: "Everyone",
  students: "Students",
  officers: "Officers",
};

export function ChapterInbox({
  currentUserId,
  role,
  announcements,
  conversations,
  members,
  activeUserId,
  activeMessages,
}: ChapterInboxProps) {
  const router = useRouter();
  const isOfficer = role === "officer" || role === "advisor";
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeMember = useMemo(
    () =>
      members.find((member) => member.id === activeUserId) ??
      conversations.find((conversation) => conversation.user_id === activeUserId) ??
      null,
    [activeUserId, conversations, members],
  );

  useEffect(() => {
    if (!activeUserId) return;
    const conversation = conversations.find((item) => item.user_id === activeUserId);
    if (!conversation || conversation.unread_count === 0) return;
    startTransition(async () => {
      await markConversationRead(activeUserId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  const openConversation = (userId: string) => {
    router.push(`/messages?with=${userId}`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SocialPanel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Announcements</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chapter-wide posts everyone can see here and on the dashboard.
            </p>
          </div>
        </div>

        {isOfficer ? (
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              setError("");
              startTransition(async () => {
                try {
                  await createAnnouncement(formData);
                  form.reset();
                  router.refresh();
                } catch (saveError) {
                  setError(
                    saveError instanceof Error
                      ? saveError.message
                      : "Could not post announcement",
                  );
                }
              });
            }}
          >
            <div>
              <Label htmlFor="announcement-message">New announcement</Label>
              <textarea
                id="announcement-message"
                name="message"
                rows={3}
                required
                placeholder="Meeting moved to Thursday in room 214…"
                className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-40 flex-1">
                <Label htmlFor="announcement-visible-to">Visible to</Label>
                <select
                  id="announcement-visible-to"
                  name="visible_to"
                  defaultValue="all"
                  className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">Everyone</option>
                  <option value="students">Students only</option>
                  <option value="officers">Officers only</option>
                </select>
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Posting…" : "Post"}
              </Button>
            </div>
          </form>
        ) : null}

        {announcements.length ? (
          <ul className="mt-5 space-y-3">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="rounded-xl bg-muted px-4 py-3">
                <p className="text-sm leading-relaxed text-pretty">{announcement.message}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {announcement.author_name || "Officer"} ·{" "}
                    {VISIBILITY_LABEL[announcement.visible_to] ?? announcement.visible_to} ·{" "}
                    {new Date(announcement.created_at).toLocaleString()}
                  </p>
                  {isOfficer ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteAnnouncement(announcement.id);
                          router.refresh();
                        })
                      }
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">No announcements yet.</p>
        )}
      </SocialPanel>

      <SocialPanel className="flex min-h-[32rem] flex-col">
        <h2 className="text-[15px] font-semibold tracking-tight">Messages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isOfficer
            ? "Message a member, all students, or the whole chapter."
            : "Read and reply to messages from officers and advisors."}
        </p>

        <form
          key={activeUserId ?? "new"}
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const to = String(formData.get("to") ?? "");
            const body = String(formData.get("body") ?? "");
            setError("");
            startTransition(async () => {
              try {
                if (to === "students" || to === "all") {
                  await sendBroadcastMessage(to, body);
                  form.reset();
                  router.refresh();
                  return;
                }
                if (!to) throw new Error("Choose someone to message.");
                await sendDirectMessage(to, body);
                form.reset();
                router.push(`/messages?with=${to}`);
                router.refresh();
              } catch (sendError) {
                setError(
                  sendError instanceof Error ? sendError.message : "Could not send message",
                );
              }
            });
          }}
        >
          <div>
            <Label htmlFor="message-to">To</Label>
            <select
              id="message-to"
              name="to"
              required
              defaultValue={activeUserId ?? ""}
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" disabled>
                Choose a member
              </option>
              {isOfficer ? (
                <>
                  <option value="students">All students</option>
                  <option value="all">Everyone</option>
                </>
              ) : null}
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {displayName(member.first_name, member.last_name, member.email)}
                  {member.role === "student" ? "" : ` · ${member.role}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="message-body">Message</Label>
            <textarea
              id="message-body"
              name="body"
              rows={3}
              required
              placeholder={isOfficer ? "Write a message to a member…" : "Write a reply…"}
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Sending…" : "Send"}
          </Button>
        </form>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-5 grid min-h-0 flex-1 gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
          <ul className="space-y-1">
            {conversations.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">No messages yet.</li>
            ) : (
              conversations.map((conversation) => {
                const selected = conversation.user_id === activeUserId;
                return (
                  <li key={conversation.user_id}>
                    <button
                      type="button"
                      onClick={() => openConversation(conversation.user_id)}
                      className={cn(
                        "flex w-full min-h-10 items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-150",
                        selected
                          ? "bg-primary/8 text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {displayName(conversation.first_name, conversation.last_name)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs">
                          {conversation.last_body}
                        </span>
                      </span>
                      {conversation.unread_count > 0 ? (
                        <Badge className="tabular-nums">{conversation.unread_count}</Badge>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="flex min-h-64 flex-col rounded-xl bg-muted p-3">
            {activeUserId ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  {activeMember
                    ? displayName(activeMember.first_name, activeMember.last_name)
                    : "Conversation"}
                </p>
                <ul className="mt-3 flex-1 space-y-2 overflow-y-auto">
                  {activeMessages.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      No messages in this thread yet. Send one above.
                    </li>
                  ) : (
                    activeMessages.map((message) => {
                      const mine = message.sender_id === currentUserId;
                      return (
                        <li
                          key={message.id}
                          className={cn("flex", mine ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                              mine
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-foreground shadow-border",
                            )}
                          >
                            <p className="text-pretty">{message.body}</p>
                            <p
                              className={cn(
                                "mt-1 text-[11px] tabular-nums",
                                mine
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground",
                              )}
                            >
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </>
            ) : (
              <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
                Choose a conversation or send a new message.
              </p>
            )}
          </div>
        </div>
      </SocialPanel>
    </div>
  );
}
