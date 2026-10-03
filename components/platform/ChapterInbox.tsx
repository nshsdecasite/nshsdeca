"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncement, deleteAnnouncement } from "@/app/admin/actions";
import {
  markConversationRead,
  sendBroadcastMessage,
  sendDirectMessage,
} from "@/app/messages/actions";
import { DecaButton } from "@/components/deca/button";
import { initialsFromName } from "@/lib/deca/format";
import { displayName } from "@/lib/auth/display-name";
import type { UserRole } from "@/lib/auth/roles";
import type {
  Announcement,
  DirectMessage,
  MessageConversation,
  MessageableMember,
} from "@/lib/platform/types";
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
  all: "CHAPTER",
  students: "STUDENTS",
  officers: "OFFICERS",
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
  const [composeOpen, setComposeOpen] = useState(false);
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-[40px] font-black tracking-[-0.04em]">
            Announcements
          </h1>
          <p className="mt-2.5 text-sm text-ink-2">
            From the officer team. Members get these here and on the dashboard.
          </p>
        </div>
        {isOfficer ? (
          <DecaButton onClick={() => setComposeOpen((value) => !value)}>
            New announcement
          </DecaButton>
        ) : null}
      </div>

      {isOfficer && composeOpen ? (
        <form
          className="deca-card mt-6 max-w-[900px] px-8 py-7"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            setError("");
            startTransition(async () => {
              try {
                await createAnnouncement(formData);
                form.reset();
                setComposeOpen(false);
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
          <textarea
            name="message"
            rows={3}
            required
            placeholder="Bus forms are due Friday…"
            className="deca-field resize-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select name="visible_to" defaultValue="all" className="deca-field max-w-xs">
              <option value="all">Everyone</option>
              <option value="students">Students only</option>
              <option value="officers">Officers only</option>
            </select>
            <DecaButton type="submit" disabled={isPending}>
              {isPending ? "Posting…" : "Post"}
            </DecaButton>
          </div>
        </form>
      ) : null}

      <div className="mt-[26px] flex max-w-[900px] flex-col gap-3.5">
        {announcements.length === 0 ? (
          <div className="deca-card px-8 py-7 text-sm text-mute">No announcements yet.</div>
        ) : (
          announcements.map((announcement, index) => {
            const author = announcement.author_name || "Officer";
            return (
              <article
                key={announcement.id}
                className={cn(
                  "deca-card px-8 py-7",
                  index === 0 && "border-[1.5px] border-ever",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-ever-lt text-[13px] font-extrabold text-ever-dk">
                    {initialsFromName(author)}
                  </div>
                  <div className="flex-1">
                    <p className="m-0 text-[13px] font-bold">{author}</p>
                    <p className="mt-0.5 text-xs text-mute">
                      {new Date(announcement.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  {index === 0 ? (
                    <span className="rounded-full bg-ever-dk px-3 py-1 text-[10px] font-extrabold text-white">
                      PINNED
                    </span>
                  ) : null}
                  <span className="rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
                    {VISIBILITY_LABEL[announcement.visible_to] ?? "CHAPTER"}
                  </span>
                </div>
                <p className="mt-4 max-w-[64ch] text-sm leading-[1.65] text-ink-2">
                  {announcement.message}
                </p>
                {isOfficer ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteAnnouncement(announcement.id);
                        router.refresh();
                      })
                    }
                    className="mt-3 text-[11px] font-bold text-mute hover:text-ink"
                  >
                    Delete
                  </button>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <div className="deca-card mt-8 px-8 py-7">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
          Messages
        </h2>
        <p className="mt-1 text-sm text-ink-2">
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
          <select
            name="to"
            required
            defaultValue={activeUserId ?? ""}
            className="deca-field"
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
          <textarea
            name="body"
            rows={3}
            required
            placeholder={isOfficer ? "Write a message to a member…" : "Write a reply…"}
            className="deca-field resize-none"
          />
          <DecaButton type="submit" disabled={isPending}>
            {isPending ? "Sending…" : "Send"}
          </DecaButton>
        </form>

        {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}

        <div className="mt-5 grid min-h-0 gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
          <ul className="space-y-1">
            {conversations.length === 0 ? (
              <li className="px-2 py-3 text-sm text-mute">No messages yet.</li>
            ) : (
              conversations.map((conversation) => {
                const selected = conversation.user_id === activeUserId;
                return (
                  <li key={conversation.user_id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/messages?with=${conversation.user_id}`)}
                      className={cn(
                        "flex w-full items-start justify-between gap-2 rounded-2xl px-3 py-2 text-left",
                        selected ? "bg-ever-lt text-ink" : "text-mute hover:bg-ground",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-ink">
                          {displayName(conversation.first_name, conversation.last_name)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs">
                          {conversation.last_body}
                        </span>
                      </span>
                      {conversation.unread_count > 0 ? (
                        <span className="rounded-full bg-ever px-2 py-px text-[11px] font-extrabold text-white">
                          {conversation.unread_count}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="flex min-h-64 flex-col rounded-2xl bg-ground p-4">
            {activeUserId ? (
              <>
                <p className="text-sm font-bold">
                  {activeMember
                    ? displayName(activeMember.first_name, activeMember.last_name)
                    : "Conversation"}
                </p>
                <ul className="mt-3 flex-1 space-y-2 overflow-y-auto">
                  {activeMessages.length === 0 ? (
                    <li className="text-sm text-mute">No messages in this thread yet.</li>
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
                              "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                              mine ? "bg-ever-dk text-white" : "bg-white text-ink shadow-card",
                            )}
                          >
                            <p>{message.body}</p>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </>
            ) : (
              <p className="m-auto max-w-xs text-center text-sm text-mute">
                Choose a conversation or send a new message.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
