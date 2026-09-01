import type { Metadata } from "next";
import { listNotes } from "@/app/platform/actions";
import { NotesWorkspace } from "@/components/platform/NotesWorkspace";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Notes",
};

export default async function NotesPage() {
  await requireAuth("/notes");
  const notes = await listNotes();

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/study"
        backLabel="Study tools"
        eyebrow="Notes"
        title="Personal notes"
        description="Keep tabbed notebooks for event prep, formulas, and study reminders. Notes autosave and can be searched from the sidebar."
      />
      <NotesWorkspace notes={notes} />
    </SocialPage>
  );
}
