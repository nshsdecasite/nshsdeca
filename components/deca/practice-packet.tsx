"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Segmented } from "@/components/deca/segmented";
import type { BodyBlock, PracticePacket } from "@/lib/roleplay-gen/types";

function Blocks({ blocks }: { blocks: BodyBlock[] }) {
  return (
    <>
      {blocks.map((block, index) =>
        block.type === "p" ? (
          <p key={index} className="text-[15px] leading-7 text-pretty text-ink">
            {block.text}
          </p>
        ) : (
          <ul key={index} className="list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-ink">
            {block.items.map((item, itemIndex) => (
              <li key={`${index}-${itemIndex}`} className="text-pretty">
                {item}
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}

function Paper({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-card sm:p-8">{children}</section>
  );
}

export function PracticePacketView({ packet }: { packet: PracticePacket }) {
  const [view, setView] = useState<"participant" | "judge">("participant");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "participant", label: "Your packet" },
            { value: "judge", label: "Judge materials" },
          ]}
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-ever-dk shadow-card transition-[scale,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]"
        >
          Print
        </button>
      </div>

      <div className={view === "participant" ? "block" : "hidden print:block"}>
        <Paper>
          <p className="text-[12px] font-bold tracking-[0.14em] text-ever-dk uppercase">
            {packet.idLabel}
          </p>
          <h2 className="mt-2 font-display text-[28px] leading-tight font-black tracking-[-0.04em] text-balance text-ink sm:text-[34px]">
            {packet.title}
          </h2>
          <dl className="mt-4 space-y-1 text-sm text-ink-2">
            {packet.headerLines.map((line) => (
              <div key={line.label} className="flex flex-wrap gap-2">
                <dt className="font-bold text-ink">{line.label}</dt>
                <dd>{line.value}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-8 text-[12px] font-bold tracking-[0.14em] text-mute uppercase">
            Participant instructions
          </h3>
          <div className="mt-3 space-y-2">
            {packet.instructions.map((line) => (
              <p key={line} className="text-sm leading-6 text-pretty text-ink-2">
                {line}
              </p>
            ))}
          </div>

          <h3 className="mt-8 text-[12px] font-bold tracking-[0.14em] text-mute uppercase">Solution</h3>
          <ul className="mt-3 space-y-1.5 text-[15px] leading-6 text-ink">
            {packet.solution.map((item) => (
              <li key={item.label}>
                <span className="font-bold">{item.label}</span>
                <span className="text-ink-2"> — {item.description}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-8 text-[12px] font-bold tracking-[0.14em] text-mute uppercase">
            Career competencies
          </h3>
          <ul className="mt-3 space-y-1.5 text-[15px] leading-6 text-ink">
            {packet.competencies.map((item) => (
              <li key={item.label}>
                <span className="font-bold">{item.label}</span>
                <span className="text-ink-2"> — {item.description}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-8 text-[12px] font-bold tracking-[0.14em] text-mute uppercase">
            Performance indicators
          </h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-6 text-ink">
            {packet.performanceIndicators.map((indicator) => (
              <li key={indicator} className="text-pretty">
                {indicator}
              </li>
            ))}
          </ul>

          <h3 className="mt-8 text-[12px] font-bold tracking-[0.14em] text-mute uppercase">
            Event situation
          </h3>
          <div className="mt-3 space-y-4">
            <p className="text-[15px] leading-7 text-pretty text-ink">{packet.opening}</p>
            <Blocks blocks={packet.blocks} />
            <p className="text-[15px] leading-7 text-pretty text-ink">{packet.closing}</p>
          </div>
        </Paper>
      </div>

      <div className={view === "judge" ? "block space-y-4" : "hidden space-y-4 print:block print:break-before-page"}>
        <Paper>
          <p className="text-[12px] font-bold tracking-[0.14em] text-ever-dk uppercase">
            Judge instructions · {packet.idLabel}
          </p>
          <h2 className="mt-2 font-display text-[28px] font-black tracking-[-0.04em] text-balance">
            Judge characterization
          </h2>
          <div className="mt-4 space-y-4">
            <p className="text-[15px] leading-7 text-pretty text-ink">{packet.judgeIntro}</p>
            <Blocks blocks={packet.judgeBlocks} />
            <p className="text-[15px] leading-7 text-pretty text-ink">{packet.judgeProcedure}</p>
            <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-7 text-ink">
              {packet.judgeQuestions.map((question) => (
                <li key={question} className="text-pretty">
                  {question}
                </li>
              ))}
            </ol>
          </div>
        </Paper>

        {packet.judgeSolution ? (
          <Paper>
            <h2 className="font-display text-[28px] font-black tracking-[-0.04em] text-balance">
              Solution
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-pretty text-ink">
              {packet.judgeSolution.conceptIntro}
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-ink">
              {packet.judgeSolution.conceptBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className="mt-6 text-[12px] font-bold tracking-[0.14em] text-mute uppercase">
              Calculations
            </h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-ink">
              {packet.judgeSolution.steps.map((step) => (
                <li key={step} className="text-pretty">
                  {step}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] leading-7 text-pretty text-ink">
              {packet.judgeSolution.modelConclusion}
            </p>
          </Paper>
        ) : null}

        <Paper>
          <p className="text-[12px] font-bold tracking-[0.14em] text-mute uppercase">
            Evaluation instructions
          </p>
          <p className="mt-3 text-sm leading-6 text-pretty text-ink-2">
            Evaluate the solution and how the participant applies the performance indicators on this form.
            Participants may show other indicators, but these are the ones being evaluated. Keep the same
            expectations for every participant. The maximum score is {packet.evaluation.total} points.{" "}
            {packet.evaluation.weighting}
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <caption className="mb-3 text-left font-display text-xl font-black tracking-[-0.03em] text-ink">
                Levels of evaluation
              </caption>
              <thead>
                <tr className="border-b border-edge text-[11px] font-bold tracking-wide text-mute uppercase">
                  <th className="py-2 pr-3 font-bold">Focus</th>
                  {packet.evaluation.levels.map((level) => (
                    <th key={level} className="px-2 py-2 font-bold">
                      {level}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packet.evaluation.focusAreas.map((area) => (
                  <tr key={area.name} className="border-b border-edge align-top">
                    <th className="py-3 pr-3 font-bold text-ink">{area.name}</th>
                    {area.cells.map((cell) => (
                      <td key={cell} className="px-2 py-3 leading-5 text-pretty text-ink-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-8 font-display text-xl font-black tracking-[-0.03em]">
            {packet.evaluation.formTitle}
          </h3>
          <p className="mt-1 mb-3 text-[12px] font-bold tracking-[0.14em] text-mute uppercase">
            Judge&apos;s evaluation form · Practice event · {packet.evaluation.instructionalArea}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-[11px] font-bold tracking-wide text-mute uppercase">
                  <th className="py-2 pr-3 font-bold">Rate the participant</th>
                  {packet.evaluation.levels.map((level) => (
                    <th key={level} className="px-2 py-2 text-right font-bold">
                      {level}
                    </th>
                  ))}
                  <th className="py-2 pl-2 text-right font-bold">Max</th>
                </tr>
              </thead>
              <tbody>
                {packet.evaluation.rows.map((row, index) => {
                  const previous = packet.evaluation.rows[index - 1];
                  const showSection = previous?.section !== row.section;
                  return (
                    <tr key={`${row.section}-${row.label}-${index}`} className="border-b border-edge align-top">
                      <th className="py-3 pr-3 font-semibold text-ink">
                        {showSection ? (
                          <span className="mb-1 block text-[11px] font-bold tracking-wide text-mute uppercase">
                            {row.section}
                          </span>
                        ) : null}
                        <span className="text-pretty">{row.label}</span>
                        {row.description ? (
                          <span className="mt-0.5 block text-[13px] font-normal text-pretty text-ink-2">
                            {row.description}
                          </span>
                        ) : null}
                      </th>
                      {row.bands.map((band) => (
                        <td key={band.level} className="px-2 py-3 text-right font-semibold text-ink tabular-nums">
                          {band.range}
                        </td>
                      ))}
                      <td className="py-3 pl-2 text-right font-bold text-ink tabular-nums">{row.max}</td>
                    </tr>
                  );
                })}
                <tr>
                  <th className="py-3 pr-3 font-black text-ink">Total</th>
                  <td colSpan={packet.evaluation.levels.length} />
                  <td className="py-3 pl-2 text-right font-black text-ink tabular-nums">
                    {packet.evaluation.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Paper>

        <details className="rounded-[20px] bg-white px-5 py-4 shadow-card print:hidden">
          <summary className="cursor-pointer text-sm font-bold text-ever-dk">
            Study notes, not part of the event
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-[12px] font-bold tracking-[0.14em] text-mute uppercase">Why each indicator is here</h3>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-ink-2">
                {packet.studyNotes.hooks.map((hook) => (
                  <li key={hook.label}>
                    <span className="font-bold text-ink">{hook.label}</span> {hook.hook}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[12px] font-bold tracking-[0.14em] text-mute uppercase">One strong answer</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-ink-2">
                {packet.studyNotes.outline.map((item) => (
                  <li key={item} className="text-pretty">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </div>

      <p className="text-[12px] text-mute print:hidden">
        Practice event written with {packet.model}. Not a district, state, or ICDC scenario.
      </p>
    </motion.div>
  );
}
