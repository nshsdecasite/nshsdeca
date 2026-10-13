"use client";

import { useEffect, useState, useTransition } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { recordSolutionPeek } from "@/app/roleplay/actions";
import { DecaButton } from "@/components/deca/button";
import { reflowRoleplayText, type RoleplayBlock } from "@/lib/roleplay/reflow-text";
import { cn } from "@/lib/utils";

const warningEase = [0.2, 0, 0, 1] as const;

const warningPiece = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.32, ease: warningEase },
  },
  exit: {
    opacity: 0,
    y: -6,
    filter: "blur(4px)",
    transition: { duration: 0.14, ease: warningEase },
  },
};

function CaseBody({ text }: { text: string }) {
  const blocks = reflowRoleplayText(text);
  if (!blocks.length) {
    return <p className="mt-5 text-base text-mute">Nothing is written here yet.</p>;
  }

  return (
    <div className="mt-5 space-y-4 text-base leading-[1.7] text-ink">
      {blocks.map((block, index) => (
        <CaseBlock key={index} block={block} />
      ))}
    </div>
  );
}

function CaseBlock({ block }: { block: RoleplayBlock }) {
  if (block.kind === "list") {
    return (
      <ul className="list-disc space-y-1.5 pl-5">
        {block.items.map((item, index) => (
          <li key={index} className="text-pretty pl-1">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "table") {
    const showHead = block.columns.some((column) => column.trim());
    const labelColumn = block.rows.some((row) => /[A-Za-z]/.test(row[0] ?? ""));
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-[15px] leading-6 text-ink">
          {showHead ? (
            <thead>
              <tr>
                {block.columns.map((column, index) => (
                  <th
                    key={index}
                    className={cn(
                      "border-b border-black/10 px-3 pb-2 pt-1 text-[12px] font-bold text-ink-2",
                      index === 0 && labelColumn ? "pl-0 text-left" : "text-right",
                    )}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, index) => (
                  <td
                    key={index}
                    className={cn(
                      "border-b border-black/[0.06] px-3 py-2 align-baseline tabular-nums",
                      index === 0 && labelColumn
                        ? "pl-0 text-left font-medium whitespace-normal"
                        : "whitespace-nowrap text-right",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p className="text-pretty">{block.text}</p>;
}

export function ScenarioCase({
  scenarioId,
  situation,
  solution,
  hasAttempt,
}: {
  scenarioId: string;
  situation: string | null;
  solution: string | null;
  hasAttempt: boolean;
}) {
  const [tab, setTab] = useState<"situation" | "solution">("situation");
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningPresent, setWarningPresent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (warningOpen || !warningPresent) return;
    const timer = window.setTimeout(() => setWarningPresent(false), 280);
    return () => window.clearTimeout(timer);
  }, [warningOpen, warningPresent]);
  const tabs = [
    { id: "situation" as const, label: "The Situation" },
    { id: "solution" as const, label: "Solution" },
  ];

  function selectTab(next: "situation" | "solution") {
    if (next === "solution" && tab !== "solution" && !hasAttempt) {
      setError("");
      setWarningPresent(true);
      setWarningOpen(true);
      return;
    }
    setTab(next);
  }

  function openSolution() {
    setError("");
    startTransition(async () => {
      try {
        await recordSolutionPeek(scenarioId);
        setTab("solution");
        setWarningOpen(false);
      } catch {
        setError("Could not open the solution. Try again.");
      }
    });
  }

  return (
    <div className="deca-card px-[38px] py-[34px]">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-extrabold transition-[background-color,color,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]",
                active ? "bg-ever-dk text-white" : "bg-ground text-ink-2",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "situation" ? (
        <CaseBody text={situation ?? ""} />
      ) : solution ? (
        <CaseBody text={solution} />
      ) : (
        <p className="mt-5 text-base text-mute">No written solution is stored for this scenario.</p>
      )}

      <DialogPrimitive.Root
        open={warningPresent}
        onOpenChange={(next) => {
          if (!next && !pending) setWarningOpen(false);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay asChild>
            <motion.div
              className={cn(
                "fixed inset-0 z-50 bg-black/20 backdrop-blur-[1.5px]",
                !warningOpen && "pointer-events-none",
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: warningOpen ? 1 : 0 }}
              transition={{ duration: warningOpen ? 0.28 : 0.16, ease: warningEase }}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild>
            <motion.div
              className={cn(
                "fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100%-2rem))] rounded-[28px] bg-white p-7 shadow-card outline-none",
                !warningOpen && "pointer-events-none",
              )}
              initial="hidden"
              animate={warningOpen ? "show" : "exit"}
              variants={{
                hidden: { opacity: 0, x: "-50%", y: "calc(-50% + 14px)" },
                show: {
                  opacity: 1,
                  x: "-50%",
                  y: "-50%",
                  transition: {
                    duration: 0.34,
                    ease: warningEase,
                    staggerChildren: 0.08,
                    delayChildren: 0.05,
                  },
                },
                exit: {
                  opacity: 0,
                  x: "-50%",
                  y: "calc(-50% - 8px)",
                  transition: {
                    duration: 0.18,
                    ease: warningEase,
                    staggerChildren: 0.03,
                    staggerDirection: -1,
                  },
                },
              }}
            >
              <DialogPrimitive.Close
                className="absolute right-5 top-5 rounded-full p-1 text-mute transition-[opacity,scale,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:text-ink active:scale-[0.96]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
              <motion.div variants={warningPiece}>
                <DialogPrimitive.Title className="pr-6 font-display text-[26px] font-black tracking-[-0.03em] text-balance text-ink">
                  This is the answer
                </DialogPrimitive.Title>
              </motion.div>
              <motion.div variants={warningPiece}>
                <DialogPrimitive.Description className="pt-2 text-pretty text-[15px] leading-relaxed text-ink-2">
                  The solution is the answer to this roleplay. You have not recorded an attempt yet.
                </DialogPrimitive.Description>
              </motion.div>
              {error ? <p className="pt-3 text-sm text-[#b42318]">{error}</p> : null}
              <motion.div variants={warningPiece} className="flex flex-wrap justify-end gap-2 pt-5">
                <DecaButton
                  variant="outline"
                  size="sm"
                  onClick={() => setWarningOpen(false)}
                  disabled={pending}
                >
                  Go back
                </DecaButton>
                <DecaButton size="sm" onClick={openSolution} disabled={pending}>
                  {pending ? "Opening…" : "Show the solution"}
                </DecaButton>
              </motion.div>
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
