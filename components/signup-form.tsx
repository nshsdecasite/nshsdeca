"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUp, type AuthActionState } from "@/app/auth/actions";
import { DecaButton } from "@/components/deca/button";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <DecaButton type="submit" disabled={pending} className="mt-2 w-full">
      {pending ? "Creating account" : "Create an account"}
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
  mono,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
  mono?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-mute"
      >
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
        className={`w-full rounded-[6px] border border-edge bg-white px-3.5 py-[11px] text-sm text-ink ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, initialState);

  if (state.message) {
    return (
      <div className="px-14 py-16">
        <h1 className="font-display text-[32px] font-extrabold tracking-[-0.03em] text-ink">
          Account created
        </h1>
        <p className="mt-4 max-w-[46ch] text-[15px] leading-[1.65] text-ink-2">
          {state.message}
        </p>
        <DecaButton href="/login" className="mt-8">
          Sign in
        </DecaButton>
      </div>
    );
  }

  return (
    <div className="px-14 py-16">
      <p className="eyebrow">New members</p>
      <h1 className="mt-4 font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink">
        Create an account
      </h1>
      <p className="mt-4 max-w-[46ch] text-base leading-[1.65] text-ink-2">
        Use your Dallas ISD school email.
      </p>
      <form action={formAction} className="mt-10 flex max-w-md flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" name="firstName" autoComplete="given-name" required />
          <Field label="Last name" name="lastName" autoComplete="family-name" required />
        </div>
        <Field
          label="School email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@student.dallasisd.org"
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
          <label
            htmlFor="gradeLevel"
            className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-mute"
          >
            Grade
          </label>
          <select
            id="gradeLevel"
            name="gradeLevel"
            required
            defaultValue=""
            className="w-full rounded-[6px] border border-edge bg-white px-3.5 py-[11px] text-sm text-ink"
          >
            <option value="" disabled>
              Select grade
            </option>
            <option value="9">9</option>
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
          </select>
        </div>
        {state.error ? (
          <p className="text-sm leading-[1.6] text-[#b42318]">{state.error}</p>
        ) : null}
        <SubmitButton />
      </form>
      <p className="mt-6 text-sm text-ink-2">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-ink shadow-[inset_0_-1px_0_var(--color-hair)] hover:text-ink hover:shadow-[inset_0_-2px_0_var(--color-gold-br)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function SignupIntro() {
  return null;
}
