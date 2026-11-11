"use client";

import { useState } from "react";

type Operator = "+" | "−" | "×" | "÷";

function formatResult(value: number) {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round(value * 1e10) / 1e10;
  const text = String(rounded);
  if (text.length <= 12) return text;
  return rounded.toExponential(6);
}

function calculate(left: number, operator: Operator, right: number) {
  if (operator === "+") return left + right;
  if (operator === "−") return left - right;
  if (operator === "×") return left * right;
  if (right === 0) return Number.NaN;
  return left / right;
}

export function TestCalculator() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [overwrite, setOverwrite] = useState(true);

  function reset() {
    setDisplay("0");
    setStored(null);
    setOperator(null);
    setOverwrite(true);
  }

  function typeDigit(digit: string) {
    setDisplay((current) => {
      if (current === "Error" || overwrite) return digit;
      if (current.replace("-", "").replace(".", "").length >= 12) return current;
      if (current === "0") return digit;
      if (current === "-0") return `-${digit}`;
      return current + digit;
    });
    setOverwrite(false);
  }

  function typeDecimal() {
    setDisplay((current) => {
      if (current === "Error" || overwrite) return "0.";
      if (current.includes(".")) return current;
      return `${current}.`;
    });
    setOverwrite(false);
  }

  function pressOperator(next: Operator) {
    if (display === "Error") {
      reset();
      return;
    }
    const value = Number(display);
    if (!Number.isFinite(value)) {
      reset();
      return;
    }
    if (stored != null && operator && !overwrite) {
      const result = calculate(stored, operator, value);
      setDisplay(formatResult(result));
      setStored(Number.isFinite(result) ? result : null);
      setOperator(Number.isFinite(result) ? next : null);
      setOverwrite(true);
      return;
    }
    setStored(value);
    setOperator(next);
    setOverwrite(true);
  }

  function equals() {
    if (stored == null || operator == null || display === "Error") return;
    const value = Number(display);
    if (!Number.isFinite(value)) {
      reset();
      return;
    }
    const result = calculate(stored, operator, value);
    setDisplay(formatResult(result));
    setStored(null);
    setOperator(null);
    setOverwrite(true);
  }

  const operatorTone = (symbol: Operator) =>
    operator === symbol && overwrite ? "bg-ever text-white" : "bg-ever-lt text-ever-dk";

  const keys: { label: string; onPress: () => void; span?: string; tone: string }[] = [
    { label: "C", onPress: reset, tone: "bg-ground text-ink" },
    { label: "÷", onPress: () => pressOperator("÷"), tone: operatorTone("÷") },
    { label: "×", onPress: () => pressOperator("×"), tone: operatorTone("×") },
    { label: "−", onPress: () => pressOperator("−"), tone: operatorTone("−") },
    { label: "7", onPress: () => typeDigit("7"), tone: "bg-ground text-ink" },
    { label: "8", onPress: () => typeDigit("8"), tone: "bg-ground text-ink" },
    { label: "9", onPress: () => typeDigit("9"), tone: "bg-ground text-ink" },
    { label: "+", onPress: () => pressOperator("+"), span: "row-span-2", tone: operatorTone("+") },
    { label: "4", onPress: () => typeDigit("4"), tone: "bg-ground text-ink" },
    { label: "5", onPress: () => typeDigit("5"), tone: "bg-ground text-ink" },
    { label: "6", onPress: () => typeDigit("6"), tone: "bg-ground text-ink" },
    { label: "1", onPress: () => typeDigit("1"), tone: "bg-ground text-ink" },
    { label: "2", onPress: () => typeDigit("2"), tone: "bg-ground text-ink" },
    { label: "3", onPress: () => typeDigit("3"), tone: "bg-ground text-ink" },
    { label: "=", onPress: equals, span: "row-span-2", tone: "bg-ever-dk text-white" },
    { label: "0", onPress: () => typeDigit("0"), span: "col-span-2", tone: "bg-ground text-ink" },
    { label: ".", onPress: typeDecimal, tone: "bg-ground text-ink" },
  ];

  return (
    <div className="deca-card px-5 py-5">
      <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-balance">
        Calculator
      </h2>
      <p
        className="mt-3 overflow-hidden rounded-xl bg-ground px-3 py-2.5 text-right font-display text-[28px] font-black tracking-[-0.03em] tabular-nums"
        aria-live="polite"
      >
        {display}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {keys.map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={key.onPress}
            className={`h-full min-h-11 rounded-[10px] text-base font-extrabold tabular-nums transition-transform duration-150 active:scale-[0.96] ${key.span ?? ""} ${key.tone}`}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
