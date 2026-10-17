"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { setMemberPassword, updateMemberAccount } from "@/app/admin/actions";
import { DecaButton } from "@/components/deca/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { displayName } from "@/lib/auth/display-name";
import type { ChapterMember, MemberDossier } from "@/lib/platform/types";

const PROFILE_LABELS: Record<string, string> = {
  id: "User id",
  first_name: "First name",
  last_name: "Last name",
  username: "Username",
  username_confirmed: "Username confirmed",
  email: "Sign-in email",
  role: "Role",
  is_super_admin: "Super admin",
  grade_level: "Grade",
  event_code: "Event code",
  event_name: "Event",
  event_format: "Event format",
  cluster_name: "Cluster",
  cluster_slug: "Cluster slug",
  chapter_id: "Chapter id",
  chapter_name: "Chapter",
  school_name: "School",
  state: "State",
  total_points: "Points",
  last_login: "Last login",
  created_at: "Joined",
  avatar_url: "Avatar",
  is_public_on_leaderboard: "On leaderboard",
};

function text(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function profileText(profile: Record<string, unknown>, key: string) {
  const value = profile[key];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="deca-card mt-4 px-5 py-5 sm:px-7 sm:py-6">
      <h2 className="font-display text-xl font-extrabold tracking-[-0.03em]">{title}</h2>
      <div className="mt-4 overflow-x-auto">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-mute">{children}</p>;
}

export function MemberDossierView({
  dossier,
  canEdit,
  viewerId,
}: {
  dossier: MemberDossier;
  canEdit: boolean;
  viewerId: string;
}) {
  const profile = dossier.profile;
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(profileText(profile, "first_name"));
  const [lastName, setLastName] = useState(profileText(profile, "last_name"));
  const [username, setUsername] = useState(profileText(profile, "username"));
  const [gradeLevel, setGradeLevel] = useState(profileText(profile, "grade_level") || "11");
  const [role, setRole] = useState(profileText(profile, "role") || "student");
  const [eventCode, setEventCode] = useState(profileText(profile, "event_code"));
  const [superAdmin, setSuperAdmin] = useState(profile.is_super_admin === true);
  const [password, setPassword] = useState("");
  const name = displayName(
    profileText(profile, "first_name"),
    profileText(profile, "last_name"),
    profileText(profile, "email"),
  );
  const isSelf = profileText(profile, "id") === viewerId;
  const fields = Object.keys(profile).filter((key) => key !== "password_hash");

  const saveAccount = () => {
    setError("");
    setSaved("");
    startTransition(async () => {
      try {
        await updateMemberAccount({
          userId: profileText(profile, "id"),
          firstName,
          lastName,
          gradeLevel: Number(gradeLevel),
          role: role as ChapterMember["role"],
          eventCode,
          username,
          isSuperAdmin: superAdmin,
        });
        setSaved("Account saved.");
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save this account.");
      }
    });
  };

  const savePassword = () => {
    setError("");
    setSaved("");
    startTransition(async () => {
      try {
        await setMemberPassword(profileText(profile, "id"), password);
        setPassword("");
        setSaved("Password updated. They can sign in with it now.");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not change the password.");
      }
    });
  };

  return (
    <div>
      <Link href="/admin" className="text-[13px] font-bold text-ever-dk hover:text-ever">
        ← Chapter admin
      </Link>
      <p className="mt-4 text-xs font-bold tracking-[0.1em] uppercase text-ever-dk">
        Member record
      </p>
      <h1 className="mt-2 text-balance font-display text-[32px] font-black tracking-[-0.04em] sm:text-[40px]">
        {name}
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        @{profileText(profile, "username") || "no username"}
        {profileText(profile, "event_code") ? ` · ${profileText(profile, "event_code")}` : ""}
        {profile.is_super_admin === true ? " · Super admin" : ""}
      </p>

      {canEdit ? (
        <section className="deca-card mt-6 px-5 py-5 sm:px-7 sm:py-6">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.03em]">
            Super admin
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-pretty text-ink-2">
            Change this account, their competitive event, or give them super admin. A super admin stays an officer or advisor.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-ink-2">
              First name
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="deca-field mt-1.5"
              />
            </label>
            <label className="block text-xs font-bold text-ink-2">
              Last name
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="deca-field mt-1.5"
              />
            </label>
            <label className="block text-xs font-bold text-ink-2">
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="deca-field mt-1.5"
              />
            </label>
            <div>
              <p className="mb-1.5 text-xs font-bold text-ink-2">Grade</p>
              <SelectMenu
                value={gradeLevel}
                onValueChange={setGradeLevel}
                options={[9, 10, 11, 12].map((grade) => ({
                  value: String(grade),
                  label: String(grade),
                }))}
                aria-label="Grade"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold text-ink-2">Role</p>
              <SelectMenu
                value={role}
                onValueChange={setRole}
                options={[
                  { value: "student", label: "Student" },
                  { value: "officer", label: "Officer" },
                  { value: "advisor", label: "Advisor" },
                ]}
                aria-label="Role"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold text-ink-2">Competitive event</p>
              <SelectMenu
                value={eventCode}
                onValueChange={setEventCode}
                searchable
                options={[
                  { value: "", label: "No event" },
                  ...dossier.events.map((event) => ({
                    value: event.event_code,
                    label: `${event.event_code} — ${event.event_name}`,
                  })),
                ]}
                aria-label="Competitive event"
              />
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              checked={superAdmin}
              disabled={isSelf}
              onChange={(event) => setSuperAdmin(event.target.checked)}
              className="h-4 w-4 accent-[#47583c]"
            />
            Super admin
            {isSelf ? <span className="font-semibold text-mute">You can’t remove your own.</span> : null}
          </label>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <DecaButton onClick={saveAccount} disabled={pending}>
              {pending ? "Saving" : "Save account"}
            </DecaButton>
          </div>
          <div className="mt-6 border-t border-edge pt-5">
            <label className="block max-w-sm text-xs font-bold text-ink-2">
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="deca-field mt-1.5"
              />
            </label>
            <DecaButton
              className="mt-3"
              variant="outline"
              onClick={savePassword}
              disabled={pending || password.length === 0}
            >
              Change password
            </DecaButton>
          </div>
          {error ? <p className="mt-4 text-sm text-[#b42318]">{error}</p> : null}
          {saved ? <p className="mt-4 text-sm font-semibold text-ever-dk">{saved}</p> : null}
        </section>
      ) : null}

      <Section title="Stored on this account">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {fields.map((key) => (
            <div key={key} className="min-w-0">
              <dt className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-mute">
                {PROFILE_LABELS[key] ?? key.replaceAll("_", " ")}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold break-words text-ink">{text(profile[key])}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [dossier.flashcards.learning + dossier.flashcards.know_it, "Flashcards seen"],
          [dossier.flashcards.know_it, "Marked know it"],
          [dossier.messages.sent, "Messages sent"],
          [dossier.messages.received, "Messages received"],
        ].map(([value, label]) => (
          <div key={label} className="deca-card px-4 py-4">
            <p className="font-display text-[28px] font-black tracking-[-0.03em] tabular-nums">{value}</p>
            <p className="mt-1 text-[13px] font-semibold text-mute">{label}</p>
          </div>
        ))}
      </div>

      <Section title="Tests">
        {dossier.tests.length === 0 ? (
          <Empty>No tests stored.</Empty>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <thead>
              <tr>
                {["Exam", "Type", "Score", "Answered", "Started", "Finished"].map((heading) => (
                  <th key={heading} className="pb-3 text-[11px] font-extrabold tracking-[0.08em] uppercase text-mute">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dossier.tests.map((test) => (
                <tr key={test.id} className="border-t border-edge">
                  <td className="py-3 pr-3 font-bold">
                    {[test.exam_code, test.exam_title].filter(Boolean).join(" · ") || "Practice test"}
                  </td>
                  <td className="py-3 pr-3">{test.session_type ?? "—"}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {test.score ?? "—"}
                    {test.total_questions ? ` / ${test.total_questions}` : ""}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">
                    {test.correct_answers}/{test.answered}
                  </td>
                  <td className="py-3 pr-3">{text(test.started_at)}</td>
                  <td className="py-3">{text(test.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Roleplays">
        {dossier.submissions.length === 0 ? (
          <Empty>No roleplay submissions stored.</Empty>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <thead>
              <tr>
                {["Scenario", "Status", "Attempt", "Score", "Submitted"].map((heading) => (
                  <th key={heading} className="pb-3 text-[11px] font-extrabold tracking-[0.08em] uppercase text-mute">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dossier.submissions.map((submission) => (
                <tr key={submission.id} className="border-t border-edge">
                  <td className="py-3 pr-3 font-bold">
                    <Link href={`/admin/grading/${submission.id}`} className="hover:text-ever-dk">
                      {submission.event_code ? `${submission.event_code} · ` : ""}
                      {submission.scenario_title || submission.scenario_key || "Roleplay"}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">{submission.status ?? "—"}</td>
                  <td className="py-3 pr-3 tabular-nums">{submission.attempt_number ?? "—"}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {submission.grading_data?.total_score ?? "—"}
                  </td>
                  <td className="py-3">{text(submission.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Performance indicators">
        {dossier.pi_performance.length === 0 ? (
          <Empty>No performance-indicator stats stored.</Empty>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <thead>
              <tr>
                {["PI", "Source", "Correct", "Attempts"].map((heading) => (
                  <th key={heading} className="pb-3 text-[11px] font-extrabold tracking-[0.08em] uppercase text-mute">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dossier.pi_performance.map((row) => (
                <tr key={`${row.pi_code}-${row.source}`} className="border-t border-edge">
                  <td className="py-3 pr-3">
                    <span className="font-bold">{row.pi_code}</span>
                    <span className="mt-0.5 block text-mute">{row.indicator_text}</span>
                  </td>
                  <td className="py-3 pr-3">{row.source ?? "—"}</td>
                  <td className="py-3 pr-3 tabular-nums">{row.correct_count}</td>
                  <td className="py-3 tabular-nums">{row.total_attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Points">
        {dossier.points.length === 0 ? (
          <Empty>No points stored.</Empty>
        ) : (
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr>
                {["Points", "Action", "When"].map((heading) => (
                  <th key={heading} className="pb-3 text-[11px] font-extrabold tracking-[0.08em] uppercase text-mute">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dossier.points.map((row) => (
                <tr key={row.id} className="border-t border-edge">
                  <td className="py-3 pr-3 font-bold tabular-nums">{row.points_earned ?? "—"}</td>
                  <td className="py-3 pr-3">{row.action_type ?? row.reference_type ?? "—"}</td>
                  <td className="py-3">{text(row.earned_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Solution peeks">
        {dossier.peeks.length === 0 ? (
          <Empty>No solution peeks stored.</Empty>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {dossier.peeks.map((peek) => (
              <li key={peek.id}>
                <span className="font-bold">
                  {peek.event_code} · {peek.scenario_title || `Scenario ${peek.scenario_number}`}
                </span>
                <span className="text-mute"> · {text(peek.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Tab leaves">
        {dossier.tab_leaves.length === 0 ? (
          <Empty>No tab leaves stored.</Empty>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {dossier.tab_leaves.map((leave) => (
              <li key={leave.id}>
                <span className="font-bold">{leave.event_type}</span>
                <span className="text-mute"> · {text(leave.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Notes">
        {dossier.notes.length === 0 ? (
          <Empty>No notes stored.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {dossier.notes.map((note) => (
              <li key={note.id}>
                <p className="text-sm font-bold">{note.tab_name || "Note"}</p>
                <p className="mt-1 text-sm leading-6 text-pretty text-ink-2">
                  {note.content?.text || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Generated roleplays">
        {dossier.generated_scenarios.length === 0 ? (
          <Empty>No generated roleplays stored.</Empty>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {dossier.generated_scenarios.map((scenario) => (
              <li key={scenario.id}>
                <Link href={`/roleplays/${scenario.id}`} className="font-bold hover:text-ever-dk">
                  {scenario.event_code} · {scenario.scenario_title || "Practice event"}
                </Link>
                <span className="text-mute"> · {scenario.review_status ?? scenario.level}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Friendships">
        {dossier.friendships.length === 0 ? (
          <Empty>No friendships stored.</Empty>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {dossier.friendships.map((friend) => (
              <li key={`${friend.other_name}-${friend.created_at}`}>
                <span className="font-bold">{friend.other_name || "Member"}</span>
                <span className="text-mute"> · {friend.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Announcement reactions">
        {dossier.reactions.length === 0 ? (
          <Empty>No reactions stored.</Empty>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {dossier.reactions.map((reaction) => (
              <li key={`${reaction.reaction}-${reaction.created_at}`}>
                <span className="font-bold">{reaction.reaction}</span>
                <span className="text-mute"> · {text(reaction.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
