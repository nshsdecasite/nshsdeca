"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type AuthActionState } from "@/app/auth/actions";
import { Logo } from "@/components/logo";
import { TextField } from "@/components/text-field";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex min-h-11 items-center justify-center rounded-2xl bg-deca-green px-5 text-sm font-semibold text-white shadow-soft transition-[background-color,transform,opacity] duration-150 hover:bg-deca-green-dark active:scale-[0.96] disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl bg-white p-8 shadow-soft-lg">
        <div className="mb-6 flex justify-center">
          <Logo className="h-12 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-ink">Sign in</h1>
        <p className="mt-3 text-sm text-muted">
          Access practice tests, roleplays, study tools, and your progress
          dashboard.
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-5">
          <input type="hidden" name="next" value={nextPath ?? "/dashboard"} />

          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />

          {state.error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-deca-green transition-colors duration-150 hover:text-deca-green-dark"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
