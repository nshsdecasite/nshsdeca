"use client";

import { Label } from "@/components/ui/label";

type TimedModeFieldProps = {
  id: string;
  hint: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function TimedModeField({
  id,
  hint,
  name = "timed",
  checked,
  defaultChecked = false,
  onCheckedChange,
}: TimedModeFieldProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
      />
      <span>
        <Label htmlFor={id} className="cursor-pointer font-medium">
          Timed mode
        </Label>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </span>
    </div>
  );
}
