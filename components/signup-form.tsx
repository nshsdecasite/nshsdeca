"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUp, type AuthActionState } from "@/app/auth/actions";
import { TextField } from "@/components/text-field";

const initialState: AuthActionState = {};
const chapterName = process.env.NEXT_PUBLIC_CHAPTER_NAME ?? "Newman Smith DECA";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex min-h-11 items-center justify-center rounded-2xl bg-deca-green px-5 text-sm font-semibold text-white shadow-soft transition-[background-color,transform,opacity] duration-150 hover:bg-deca-green-dark active:scale-[0.96] disabled:opacity-60"
    >
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, initialState);

  if (state.message) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-soft-lg sm:p-8">
        <div className="rounded-2xl bg-deca-green/10 px-4 py-3">
          <p className="text-sm font-semibold text-deca-green">Account created</p>
          <p className="mt-1 text-sm text-muted">{state.message}</p>
        </div>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-deca-green px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-deca-green-dark active:scale-[0.96]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft-lg sm:p-8">
      <form action={formAction} className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="First name"
            name="firstName"
            autoComplete="given-name"
            required
          />
          <TextField
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            required
          />
        </div>

        <TextField
          label="School email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@student.dallasisd.org"
          required
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          minLength={8}
          required
        />

        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="gradeLevel" className="text-sm font-medium text-ink">
            Grade level
          </label>
          <select
            id="gradeLevel"
            name="gradeLevel"
            required
            defaultValue=""
            className="min-h-11 rounded-xl bg-white px-4 text-sm text-ink shadow-soft outline-none transition-[box-shadow,transform] duration-150 focus:shadow-[0_0_0_3px_rgba(45,106,45,0.18)] active:scale-[0.995]"
          >
            <option value="" disabled>
              Select grade
            </option>
            <option value="9">9th grade</option>
            <option value="10">10th grade</option>
            <option value="11">11th grade</option>
            <option value="12">12th grade</option>
          </select>
        </div>

        {state.error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}

export function SignupIntro() {
  return (
    <div className="max-w-xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-deca-green">
        Join {chapterName}
      </p>
      <h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
        Create your student account
      </h1>
      <p className="mt-4 text-muted">
        Sign up with your school email to access roleplay practice, tests, study
        tools, and progress tracking.
      </p>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-deca-green transition-colors duration-150 hover:text-deca-green-dark"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
