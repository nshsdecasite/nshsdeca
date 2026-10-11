"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUp, type AuthActionState } from "@/app/auth/actions";
import { DecaButton } from "@/components/deca/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { Logo } from "@/components/logo";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <DecaButton type="submit" disabled={pending} className="mt-1.5 w-full">
      {pending ? "Creating account" : "Create account"}
    </DecaButton>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required,
  placeholder,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-[7px] block text-xs font-bold text-ink-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        className="deca-field"
      />
    </div>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, initialState);

  if (state.message) {
    return (
      <div className="flex flex-col items-center px-10 py-[72px]">
        <Logo className="no-outline h-[34px] w-auto" priority />
        <div className="mt-9 w-full max-w-[460px] rounded-3xl bg-white px-12 py-11 shadow-card">
          <h1 className="text-center font-display text-[30px] font-black tracking-[-0.03em]">
            Account created
          </h1>
          <p className="mt-4 text-center text-[15px] leading-[1.65] text-ink-2">
            {state.message}
          </p>
          <DecaButton href="/login" className="mt-8 w-full">
            Sign in
          </DecaButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-10 py-[72px]">
      <Logo className="no-outline h-[34px] w-auto" priority />
      <div className="mt-9 w-full max-w-[460px] rounded-3xl bg-white px-12 py-11 shadow-card">
        <div className="flex rounded-full bg-ground p-[5px] text-sm font-bold">
          <Link
            href="/login"
            className="flex-1 rounded-full py-[9px] text-center text-ink-2 hover:text-ever-dk"
          >
            Sign in
          </Link>
          <span className="flex-1 rounded-full bg-ever-dk py-[9px] text-center text-white">
            Create account
          </span>
        </div>
        <h1 className="mt-8 text-center font-display text-[30px] font-black tracking-[-0.03em]">
          Join the chapter
        </h1>
        <form action={formAction} className="mt-7 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" name="firstName" autoComplete="given-name" required />
            <Field label="Last name" name="lastName" autoComplete="family-name" required />
          </div>
          <Field
            label="School email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@student.cfbisd.edu"
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          <div>
            <label htmlFor="gradeLevel" className="mb-[7px] block text-xs font-bold text-ink-2">
              Grade
            </label>
            <SelectMenu
              id="gradeLevel"
              name="gradeLevel"
              required
              defaultValue=""
              placeholder="Select grade"
              invalidMessage="Select a grade"
              options={[
                { value: "9", label: "9" },
                { value: "10", label: "10" },
                { value: "11", label: "11" },
                { value: "12", label: "12" },
              ]}
            />
          </div>
          {state.error ? (
            <p className="text-sm leading-[1.6] text-[#b42318]">{state.error}</p>
          ) : null}
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}

export function SignupIntro() {
  return null;
}
