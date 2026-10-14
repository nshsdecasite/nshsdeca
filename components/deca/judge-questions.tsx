"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { DecaButton } from "@/components/deca/button";
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

export function JudgeQuestions({
  questions,
  hasAttempt,
}: {
  questions: string[];
  hasAttempt: boolean;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [pendingNumber, setPendingNumber] = useState<number | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningPresent, setWarningPresent] = useState(false);

  useEffect(() => {
    if (warningOpen || !warningPresent) return;
    const timer = window.setTimeout(() => setWarningPresent(false), 280);
    return () => window.clearTimeout(timer);
  }, [warningOpen, warningPresent]);

  if (!questions.length) return null;

  function requestShow(number: number) {
    if (open[number]) {
      setOpen((current) => ({ ...current, [number]: false }));
      return;
    }
    if (!hasAttempt) {
      setPendingNumber(number);
      setWarningPresent(true);
      setWarningOpen(true);
      return;
    }
    setOpen((current) => ({ ...current, [number]: true }));
  }

  function revealPending() {
    if (pendingNumber == null) return;
    const number = pendingNumber;
    setOpen((current) => ({ ...current, [number]: true }));
    setWarningOpen(false);
  }

  return (
    <div className="deca-card px-[26px] py-6">
      <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
        Judge questions
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {questions.map((question, index) => {
          const number = index + 1;
          const shown = Boolean(open[number]);
          return (
            <button
              key={number}
              type="button"
              aria-expanded={shown}
              onClick={() => requestShow(number)}
              className="rounded-full bg-ever-lt px-3 py-1.5 text-[13px] font-bold text-ever-dk transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[#e3e9d8] active:scale-[0.96]"
            >
              {shown ? `Hide question ${number}` : `Show question ${number}`}
            </button>
          );
        })}
      </div>
      {questions.some((_, index) => open[index + 1]) ? (
        <div className="mt-4 flex flex-col gap-4">
          {questions.map((question, index) => {
            const number = index + 1;
            if (!open[number]) return null;
            return (
              <div key={number}>
                <p className="text-[11px] font-extrabold tracking-[0.04em] text-ever-dk">
                  Question {number}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-pretty text-ink">{question}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      <DialogPrimitive.Root
        open={warningPresent}
        onOpenChange={(next) => {
          if (!next) setWarningOpen(false);
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
                  The judge asks these later
                </DialogPrimitive.Title>
              </motion.div>
              <motion.div variants={warningPiece}>
                <DialogPrimitive.Description className="pt-2 text-pretty text-[15px] leading-relaxed text-ink-2">
                  You have not recorded an attempt. In a real roleplay these stay with the judge until your presentation is over.
                </DialogPrimitive.Description>
              </motion.div>
              <motion.div variants={warningPiece} className="flex flex-wrap justify-end gap-2 pt-5">
                <DecaButton variant="outline" size="sm" onClick={() => setWarningOpen(false)}>
                  Go back
                </DecaButton>
                <DecaButton size="sm" onClick={revealPending}>
                  {pendingNumber ? `Show question ${pendingNumber}` : "Show the question"}
                </DecaButton>
              </motion.div>
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
