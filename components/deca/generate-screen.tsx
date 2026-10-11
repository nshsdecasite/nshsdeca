"use client";

import { useMemo, useState, useTransition } from "react";
import { generatePracticeEvent } from "@/app/generate/actions";
import { DecaButton } from "@/components/deca/button";
import { PracticePacketView } from "@/components/deca/practice-packet";
import { Segmented } from "@/components/deca/segmented";
import { SelectMenu } from "@/components/ui/select-menu";
import type { GeneratorEvent, PracticePacket } from "@/lib/roleplay-gen/types";

export function GenerateScreen({ events }: { events: GeneratorEvent[] }) {
  const [eventCode, setEventCode] = useState(events[0]?.code ?? "");
  const [area, setArea] = useState("");
  const [difficulty, setDifficulty] = useState<"standard" | "advanced">("standard");
  const [calculations, setCalculations] = useState(false);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [packet, setPacket] = useState<PracticePacket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const event = useMemo(
    () => events.find((item) => item.code === eventCode) ?? events[0],
    [eventCode, events],
  );

  function chooseEvent(code: string) {
    setEventCode(code);
    setArea("");
    setCalculations(false);
  }

  function generate() {
    if (!event) return;
    setError(null);
    startTransition(async () => {
      const result = await generatePracticeEvent({
        eventCode: event.code,
        primaryIA: area || undefined,
        difficulty,
        calculations: event.calculations === "optional" ? calculations : undefined,
        avoid,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPacket(result.packet);
      if (result.packet.companyName) {
        setAvoid((current) => [result.packet.companyName!, ...current].slice(0, 20));
      }
    });
  }

  if (!event) {
    return <p className="text-ink-2">No role-play events are available.</p>;
  }

  return (
    <div>
      <div className="print:hidden">
        <h1 className="font-display text-[40px] font-black tracking-[-0.04em] text-balance">
          Generate a practice event
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-6 text-pretty text-ink-2">
          Pick an event, and the site chooses real 2026–27 performance indicators. The scenario is written
          for chapter practice with GPT-5 nano.
        </p>
      </div>

      <div className="mt-8 rounded-[28px] bg-white p-5 shadow-card print:hidden sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-bold text-ink">Event</span>
            <SelectMenu
              className="mt-2"
              aria-label="Event"
              value={event.code}
              onValueChange={chooseEvent}
              options={events.map((item) => ({
                value: item.code,
                label: `${item.code} — ${item.name}`,
              }))}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-bold text-ink">
              {event.code === "PFL" ? "Topic" : "Instructional area"}
            </span>
            <SelectMenu
              className="mt-2"
              aria-label={event.code === "PFL" ? "Topic" : "Instructional area"}
              value={area}
              onValueChange={setArea}
              options={[
                { value: "", label: "Any area that fits" },
                ...event.areas.map((item) => ({
                  value: item.code,
                  label: item.name,
                })),
              ]}
            />
          </label>
        </div>

        <p className="mt-4 text-sm leading-6 text-pretty text-ink-2">
          {event.category}
          {event.pathway ? ` · ${event.pathway}` : ""} · {event.piCount} performance indicators ·{" "}
          {event.prepMinutes} min to prepare · {event.presentMinutes} min to present
        </p>

        <div className="mt-5 max-w-sm">
          <p className="mb-2 text-[13px] font-bold text-ink">Difficulty</p>
          <Segmented
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { value: "standard", label: "Standard" },
              { value: "advanced", label: "Advanced" },
            ]}
          />
        </div>

        {event.calculations === "optional" ? (
          <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={calculations}
              onChange={(change) => setCalculations(change.target.checked)}
              className="h-4 w-4 accent-ever-dk"
            />
            Include a calculation the participant has to work
          </label>
        ) : null}
        {event.calculations === "always" ? (
          <p className="mt-5 text-sm text-ink-2">
            This event includes a judge solution with the worked calculations.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <DecaButton type="button" onClick={generate} disabled={pending}>
            {pending ? "Writing the practice event…" : packet ? "Generate another" : "Generate"}
          </DecaButton>
          {pending ? (
            <p className="text-sm text-mute">Choosing indicators, then writing the scenario.</p>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-4 max-w-2xl text-sm leading-6 text-pretty text-[#8a3b16]">
            {error}
          </p>
        ) : null}
      </div>

      {packet ? (
        <div className="mt-8">
          <PracticePacketView packet={packet} />
        </div>
      ) : null}
    </div>
  );
}
