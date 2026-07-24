"use client";

import { useState, useTransition } from "react";
import { deleteNote, saveNote } from "@/app/platform/actions";
import type { Note } from "@/lib/platform/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type NotesWorkspaceProps = {
  notes: Note[];
};

export function NotesWorkspace({ notes: initialNotes }: NotesWorkspaceProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [activeId, setActiveId] = useState(initialNotes[0]?.id ?? "");
  const [tabName, setTabName] = useState(initialNotes[0]?.tab_name ?? "General");
  const [text, setText] = useState(initialNotes[0]?.content?.text ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectNote = (note: Note) => {
    setActiveId(note.id);
    setTabName(note.tab_name);
    setText(note.content?.text ?? "");
    setError("");
  };

  const handleSave = () => {
    setError("");
    startTransition(async () => {
      try {
        await saveNote({
          id: activeId || undefined,
          tabName,
          text,
        });
        window.location.reload();
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "Could not save note",
        );
      }
    });
  };

  const handleNew = () => {
    setActiveId("");
    setTabName("New note");
    setText("");
    setError("");
  };

  const handleDelete = () => {
    if (!activeId) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteNote(activeId);
        window.location.reload();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error ? deleteError.message : "Could not delete note",
        );
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <Card className="p-4">
        <aside>
          <Button type="button" onClick={handleNew} className="mb-4 w-full">
            New note
          </Button>
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => selectNote(note)}
                  className={cn(
                    "w-full rounded-2xl px-3 py-2 text-left text-sm transition-colors",
                    activeId === note.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {note.tab_name}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="mb-4">
          <Label htmlFor="note-tab-name">Tab name</Label>
          <Input
            id="note-tab-name"
            value={tabName}
            onChange={(event) => setTabName(event.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="note-text">Notes</Label>
          <textarea
            id="note-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={16}
            className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm leading-relaxed text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Write study notes, event prep, formulas..."
          />
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          {activeId ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
