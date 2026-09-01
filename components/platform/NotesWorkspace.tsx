"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function NotesWorkspace({ notes: initialNotes }: NotesWorkspaceProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [activeId, setActiveId] = useState(initialNotes[0]?.id ?? "");
  const [tabName, setTabName] = useState(initialNotes[0]?.tab_name ?? "General");
  const [text, setText] = useState(initialNotes[0]?.content?.text ?? "");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [isPending, startTransition] = useTransition();
  const saveTimer = useRef<number | null>(null);
  const skipNextAutosave = useRef(true);

  const filteredNotes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return notes;
    return notes.filter((note) => {
      const body = note.content?.text ?? "";
      return (
        note.tab_name.toLowerCase().includes(needle) ||
        body.toLowerCase().includes(needle)
      );
    });
  }, [notes, query]);

  const persist = (next: { id?: string; tabName: string; text: string }) => {
    startTransition(async () => {
      try {
        setStatus("saving");
        const saved = await saveNote(next);
        setActiveId(saved.id);
        setNotes((prev) => {
          const without = prev.filter((note) => note.id !== saved.id);
          return [saved, ...without];
        });
        setStatus("saved");
        setError("");
      } catch (saveError) {
        setStatus("error");
        setError(
          saveError instanceof Error ? saveError.message : "Could not save note",
        );
      }
    });
  };

  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      persist({
        id: activeId || undefined,
        tabName,
        text,
      });
    }, 800);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabName, text]);

  const selectNote = (note: Note) => {
    skipNextAutosave.current = true;
    setActiveId(note.id);
    setTabName(note.tab_name);
    setText(note.content?.text ?? "");
    setError("");
    setStatus("idle");
  };

  const handleNew = () => {
    skipNextAutosave.current = true;
    setActiveId("");
    setTabName("New note");
    setText("");
    setError("");
    setStatus("idle");
  };

  const handleDelete = () => {
    if (!activeId) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteNote(activeId);
        const remaining = notes.filter((note) => note.id !== activeId);
        setNotes(remaining);
        skipNextAutosave.current = true;
        if (remaining[0]) {
          selectNote(remaining[0]);
        } else {
          setActiveId("");
          setTabName("General");
          setText("");
        }
        setStatus("idle");
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
          <Button type="button" onClick={handleNew} className="mb-3 w-full">
            New note
          </Button>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes…"
            className="mb-4"
          />
          <ul className="space-y-2">
            {filteredNotes.map((note) => (
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
          {filteredNotes.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">No matching notes.</p>
          ) : null}
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              persist({
                id: activeId || undefined,
                tabName,
                text,
              })
            }
          >
            {status === "saving" || isPending ? "Saving…" : "Save"}
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
          <p className="text-xs text-muted-foreground">
            {status === "saved"
              ? "Saved"
              : status === "saving"
                ? "Saving…"
                : "Autosaves as you type"}
          </p>
        </div>
      </Card>
    </div>
  );
}
