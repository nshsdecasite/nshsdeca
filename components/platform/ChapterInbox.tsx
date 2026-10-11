"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PenLine, Trash2, Users } from "lucide-react";
import {
  createAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementReaction,
} from "@/app/admin/actions";
import {
  markConversationRead,
  sendBroadcastMessage,
  sendDirectMessage,
} from "@/app/messages/actions";
import { DecaButton } from "@/components/deca/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { initialsFromName } from "@/lib/deca/format";
import { displayName } from "@/lib/auth/display-name";
import type { UserRole } from "@/lib/auth/roles";
import type {
  Announcement,
  AnnouncementReaction,
  AnnouncementReactionName,
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
  all: "Everyone",
  students: "Students",
  officers: "Officers",
};

const ease = [0.2, 0, 0, 1] as const;

const REACTION_CHOICES: Array<{ name: AnnouncementReactionName; emoji: string; label: string }> = [
  { name: "like", emoji: "👍", label: "Like" },
  { name: "love", emoji: "❤️", label: "Love" },
  { name: "laugh", emoji: "😂", label: "Laugh" },
  { name: "celebrate", emoji: "🎉", label: "Celebrate" },
  { name: "eyes", emoji: "👀", label: "Seen" },
];

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function AnnouncementReactions({
  announcementId,
  reactions,
}: {
  announcementId: string;
  reactions: AnnouncementReaction[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(reactions);
  const [pending, setPending] = useState<AnnouncementReactionName | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setRows(reactions);
  }, [reactions]);

  function react(name: AnnouncementReactionName) {
    if (pending) return;
    const previous = rows;
    setRows((current) => {
      const existing = current.find((row) => row.reaction === name);
      if (!existing) return [...current, { reaction: name, count: 1, mine: true }];
      if (existing.mine) {
        const nextCount = existing.count - 1;
        return nextCount > 0
          ? current.map((row) =>
              row.reaction === name ? { ...row, count: nextCount, mine: false } : row,
            )
          : current.filter((row) => row.reaction !== name);
      }
      return current.map((row) =>
        row.reaction === name ? { ...row, count: row.count + 1, mine: true } : row,
      );
    });
    setError("");
    setPending(name);
    void toggleAnnouncementReaction(announcementId, name)
      .then(() => router.refresh())
      .catch((reactionError: unknown) => {
        setRows(previous);
        setError(reactionError instanceof Error ? reactionError.message : "Could not save reaction");
      })
      .finally(() => setPending(null));
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-1.5">
        {REACTION_CHOICES.map((choice) => {
          const row = rows.find((item) => item.reaction === choice.name);
          const count = row?.count ?? 0;
          const mine = row?.mine ?? false;
          return (
            <button
              key={choice.name}
              type="button"
              aria-pressed={mine}
              aria-label={choice.label}
              disabled={pending === choice.name}
              onClick={() => react(choice.name)}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold tabular-nums transition-[scale,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] disabled:opacity-70",
                mine ? "bg-ever-dk text-white" : "bg-white text-ink shadow-card",
              )}
            >
              <span aria-hidden>{choice.emoji}</span>
              {count > 0 ? <span>{count}</span> : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-sm text-[#b42318]">{error}</p> : null}
    </div>
  );
}

function personLabel(
  person:
    | Pick<MessageableMember, "first_name" | "last_name" | "email" | "role">
    | Pick<MessageConversation, "first_name" | "last_name" | "role">
    | null,
) {
  if (!person) return "Conversation";
  const name = displayName(
    person.first_name,
    person.last_name,
    "email" in person ? person.email : null,
  );
  if (!person.role || person.role === "student") return name;
  return `${name} · ${person.role}`;
}

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
  const [announcementError, setAnnouncementError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientMode, setRecipientMode] = useState<"direct" | "students" | "all">(
    "direct",
  );
  const [memberQuery, setMemberQuery] = useState("");
  const [announcementPending, startAnnouncementTransition] = useTransition();
  const [messagePending, startMessageTransition] = useTransition();

  const activeMember = useMemo(() => {
    if (!activeUserId) return null;
    const fromConversation = conversations.find(
      (conversation) => conversation.user_id === activeUserId,
    );
    if (fromConversation) return fromConversation;
    return members.find((member) => member.id === activeUserId) ?? null;
  }, [activeUserId, conversations, members]);

  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const name = displayName(member.first_name, member.last_name, member.email).toLowerCase();
      return name.includes(query) || (member.email ?? "").toLowerCase().includes(query);
    });
  }, [memberQuery, members]);

  useEffect(() => {
    if (!activeUserId) return;
    const conversation = conversations.find((item) => item.user_id === activeUserId);
    if (!conversation || conversation.unread_count === 0) return;
    startMessageTransition(async () => {
      try {
        await markConversationRead(activeUserId);
      } catch {
        // Non-blocking — unread badge can refresh on next load.
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  function openConversation(userId: string) {
    setMessageError("");
    setRecipientMode("direct");
    setMemberQuery("");
    router.push(`/messages?with=${userId}`);
  }

  function startNewMessage() {
    setMessageError("");
    setRecipientMode("direct");
    setMemberQuery("");
    router.push("/messages");
  }

  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <h1
          id="announcements-heading"
          className="font-display text-[42px] font-black tracking-[-0.04em]"
        >
          Announcements
        </h1>
        {isOfficer ? (
          <DecaButton
            variant={composeOpen ? "outline" : "ever"}
            onClick={() => {
              setAnnouncementError("");
              setComposeOpen((value) => !value);
            }}
          >
            {composeOpen ? "Cancel" : "New announcement"}
          </DecaButton>
        ) : null}
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease }}
        aria-labelledby="announcements-heading"
        className="deca-card mt-8 overflow-hidden"
      >

        {isOfficer && composeOpen ? (
          <form
            className="space-y-3 border-b border-hair bg-ever-lt/40 px-8 py-6 sm:px-9"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              setAnnouncementError("");
              startAnnouncementTransition(async () => {
                try {
                  await createAnnouncement(formData);
                  form.reset();
                  setComposeOpen(false);
                  router.refresh();
                } catch (saveError) {
                  setAnnouncementError(
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
              rows={4}
              required
              placeholder="Write an announcement…"
              className="deca-field resize-none text-[16px] leading-relaxed"
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full max-w-[14rem]">
                <SelectMenu
                  name="visible_to"
                  defaultValue="all"
                  aria-label="Who can see this announcement"
                  options={[
                    { value: "all", label: "Everyone" },
                    { value: "students", label: "Students only" },
                    { value: "officers", label: "Officers only" },
                  ]}
                />
              </div>
              <DecaButton type="submit" disabled={announcementPending}>
                {announcementPending ? "Posting…" : "Post"}
              </DecaButton>
            </div>
            {announcementError ? (
              <p className="text-sm text-[#b42318]">{announcementError}</p>
            ) : null}
          </form>
        ) : null}

        <div className="flex flex-col gap-4 px-6 py-6 sm:px-8">
          {announcements.length === 0 ? (
            <div className="rounded-[20px] bg-ground px-6 py-10 text-center text-sm text-mute">
              No announcements yet.
            </div>
          ) : (
            announcements.map((announcement, index) => {
              const author = announcement.author_name?.trim() || "Officer team";
              return (
                <article
                  key={announcement.id}
                  className={cn(
                    "rounded-[22px] px-6 py-5 transition-[box-shadow,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] sm:px-7 sm:py-6",
                    index === 0
                      ? "bg-ever-lt shadow-[inset_0_0_0_1.5px_rgba(71,88,60,0.35)]"
                      : "bg-ground",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white text-[13px] font-extrabold text-ever-dk shadow-card">
                      {initialsFromName(author)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="m-0 text-[15px] font-bold text-ink">{author}</p>
                        <span className="text-[12px] text-mute">
                          {formatWhen(announcement.created_at)}
                        </span>
                        {index === 0 ? (
                          <span className="rounded-full bg-ever-dk px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] text-white">
                            LATEST
                          </span>
                        ) : null}
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] text-ever-dk shadow-card">
                          {VISIBILITY_LABEL[announcement.visible_to] ?? "Everyone"}
                        </span>
                      </div>
                      <p className="mt-3 text-[17px] leading-[1.55] text-pretty text-ink">
                        {announcement.message}
                      </p>
                      <AnnouncementReactions
                        announcementId={announcement.id}
                        reactions={announcement.reactions ?? []}
                      />
                      {isOfficer ? (
                        <button
                          type="button"
                          disabled={announcementPending}
                          onClick={() =>
                            startAnnouncementTransition(async () => {
                              setAnnouncementError("");
                              try {
                                await deleteAnnouncement(announcement.id);
                                router.refresh();
                              } catch (deleteError) {
                                setAnnouncementError(
                                  deleteError instanceof Error
                                    ? deleteError.message
                                    : "Could not delete announcement",
                                );
                              }
                            })
                          }
                          className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-mute hover:text-ink"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
          {announcementError && !composeOpen ? (
            <p className="text-sm text-[#b42318]">{announcementError}</p>
          ) : null}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12, ease }}
        aria-labelledby="direct-messages-heading"
        className="mt-10"
      >
        <h2
          id="direct-messages-heading"
          className="mb-4 font-display text-[22px] font-extrabold tracking-[-0.03em]"
        >
          Direct messages
        </h2>

        <div className="deca-card overflow-hidden">
          <div className="grid min-h-[22rem] lg:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)]">
              <aside className="border-b border-hair bg-ground/50 lg:border-b-0 lg:border-r">
                <div className="px-3 pt-3">
                  <button
                    type="button"
                    onClick={startNewMessage}
                    className={cn(
                      "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full text-[13px] font-bold transition-[scale,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]",
                      activeUserId
                        ? "bg-white text-ink shadow-card"
                        : "bg-ever-dk text-white",
                    )}
                  >
                    <PenLine className="h-3.5 w-3.5" strokeWidth={2.5} />
                    New message
                  </button>
                </div>
                <ul className="space-y-1 px-2 py-3">
                  {conversations.length === 0 ? (
                    <li className="px-3 py-4 text-sm text-mute">No messages yet.</li>
                  ) : (
                    conversations.map((conversation) => {
                      const selected = conversation.user_id === activeUserId;
                      return (
                        <li key={conversation.user_id}>
                          <button
                            type="button"
                            onClick={() => openConversation(conversation.user_id)}
                            className={cn(
                              "flex w-full items-start gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
                              selected
                                ? "bg-white text-ink shadow-card"
                                : "text-mute hover:bg-white/70 hover:text-ink",
                            )}
                          >
                            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ever-lt text-[11px] font-extrabold text-ever-dk">
                              {initialsFromName(
                                displayName(conversation.first_name, conversation.last_name),
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-[13px] font-bold text-ink">
                                  {displayName(conversation.first_name, conversation.last_name)}
                                </span>
                                {conversation.unread_count > 0 ? (
                                  <span className="rounded-full bg-ever px-1.5 py-px text-[10px] font-extrabold text-white">
                                    {conversation.unread_count}
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block truncate text-[12px]">
                                {conversation.last_body}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </aside>

            <div className="flex min-h-[22rem] flex-col">
              <div className="flex items-center gap-3 border-b border-hair px-5 py-3.5">
                {activeUserId && activeMember ? (
                  <>
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ever-lt text-[12px] font-extrabold text-ever-dk">
                      {initialsFromName(
                        displayName(activeMember.first_name, activeMember.last_name),
                      )}
                    </div>
                    <p className="min-w-0 truncate text-sm font-bold text-ink">
                      {personLabel(activeMember)}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ground text-mute">
                      <Users className="h-4 w-4" strokeWidth={2.25} />
                    </div>
                    <p className="text-sm font-bold text-ink">New message</p>
                  </>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-ground/40 px-4 py-4">
                {activeUserId ? (
                  <ul className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                    {activeMessages.length === 0 ? (
                      <li className="m-auto text-center text-sm text-mute">No messages yet.</li>
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
                                "max-w-[min(85%,22rem)] rounded-[18px] px-3.5 py-2.5 text-sm leading-relaxed",
                                mine
                                  ? "rounded-br-md bg-ever-dk text-white"
                                  : "rounded-bl-md bg-white text-ink shadow-card",
                              )}
                            >
                              <p className="whitespace-pre-wrap">{message.body}</p>
                              <p
                                className={cn(
                                  "mt-1 text-[10px] font-medium",
                                  mine ? "text-white/65" : "text-mute",
                                )}
                              >
                                {formatWhen(message.created_at)}
                              </p>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                ) : (
                  <p className="m-auto max-w-[16rem] text-center text-sm text-pretty text-mute">
                    Pick a member, write a message, and send it.
                  </p>
                )}
              </div>

              <form
                key={activeUserId ?? "new"}
                className="space-y-3 border-t border-hair px-5 py-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const formData = new FormData(form);
                  const to = String(formData.get("to") ?? "");
                  const body = String(formData.get("body") ?? "");
                  setMessageError("");
                  startMessageTransition(async () => {
                    try {
                      if (isOfficer && (to === "students" || to === "all")) {
                        await sendBroadcastMessage(to, body);
                        form.reset();
                        setRecipientMode("direct");
                        router.refresh();
                        return;
                      }
                      const recipient = activeUserId || to;
                      if (!recipient) throw new Error("Choose someone to message.");
                      await sendDirectMessage(recipient, body);
                      form.reset();
                      setMemberQuery("");
                      router.push(`/messages?with=${recipient}`);
                      router.refresh();
                    } catch (sendError) {
                      setMessageError(
                        sendError instanceof Error
                          ? sendError.message
                          : "Could not send message",
                      );
                    }
                  });
                }}
              >
                {activeUserId ? (
                  <input type="hidden" name="to" value={activeUserId} />
                ) : (
                  <div className="space-y-2">
                    <input
                      value={memberQuery}
                      onChange={(event) => setMemberQuery(event.target.value)}
                      placeholder="Search members"
                      className="deca-field"
                      aria-label="Search members"
                    />
                    <SelectMenu
                      name="to"
                      required
                      defaultValue=""
                      placeholder="To…"
                      invalidMessage="Choose someone to message."
                      aria-label="To"
                      searchable={false}
                      onValueChange={(value) => {
                        setRecipientMode(value === "students" || value === "all" ? value : "direct");
                      }}
                      options={[
                        ...(isOfficer && !memberQuery.trim()
                          ? [
                              { value: "students", label: "All students" },
                              { value: "all", label: "Everyone" },
                            ]
                          : []),
                        ...filteredMembers.map((member) => ({
                          value: member.id,
                          label: `${displayName(member.first_name, member.last_name, member.email)}${
                            member.role === "student" ? "" : ` · ${member.role}`
                          }`,
                        })),
                      ]}
                    />
                    {filteredMembers.length === 0 ? (
                      <p className="text-sm text-mute">No members match that search.</p>
                    ) : null}
                    {isOfficer && recipientMode !== "direct" ? (
                      <p className="inline-flex items-center gap-1.5 rounded-full bg-ever-lt px-3 py-1 text-[12px] font-bold text-ever-dk">
                        <Users className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {recipientMode === "students" ? "All students" : "Everyone"}
                      </p>
                    ) : null}
                  </div>
                )}

                <textarea
                  name="body"
                  rows={3}
                  required
                  placeholder={activeUserId ? "Write a reply…" : "Write a message…"}
                  className="deca-field resize-none"
                />
                <div className="flex justify-end">
                  <DecaButton type="submit" size="sm" disabled={messagePending}>
                    {messagePending ? "Sending…" : "Send"}
                  </DecaButton>
                </div>
              </form>

              {messageError ? (
                <p className="px-5 pb-4 text-sm text-[#b42318]">{messageError}</p>
              ) : null}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
