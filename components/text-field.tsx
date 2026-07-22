import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function TextField({ label, hint, id, className = "", ...props }: TextFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        className={`min-h-11 rounded-xl bg-white px-4 text-sm text-ink shadow-soft outline-none transition-[box-shadow,transform] duration-150 placeholder:text-slate-400 focus:shadow-[0_0_0_3px_rgba(45,106,45,0.18)] active:scale-[0.995] ${className}`}
        {...props}
      />
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
