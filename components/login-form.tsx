"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type AuthActionState } from "@/app/auth/actions";
import { DecaButton } from "@/components/deca/button";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <DecaButton type="submit" disabled={pending} className="mt-2 w-full">
      {pending ? "Signing in" : "Sign in"}
    </DecaButton>
  );
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <div className="px-14 py-16">
      <p className="eyebrow">Members</p>
      <h1 className="mt-4 max-w-[14ch] font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink">
        Sign in and pick up where you left off
      </h1>
      <p className="mt-4 max-w-[36ch] text-base leading-[1.65] text-ink-2">
        Scores, notes, and every piece of feedback stay with your account all four
        years.
      </p>
      <form action={formAction} className="mt-10 flex max-w-md flex-col gap-6">
        <input type="hidden" name="next" value={nextPath ?? "/dashboard"} />
        <div>
          <label
            htmlFor="email"
            className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-mute"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-[6px] border border-edge bg-white px-3.5 py-[11px] text-sm text-ink"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-mute"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-[6px] border border-edge bg-white px-3.5 py-[11px] text-sm text-ink"
          />
        </div>
        {state.error ? (
          <p className="text-sm leading-[1.6] text-[#b42318]">{state.error}</p>
        ) : null}
        <SubmitButton />
      </form>
      <p className="mt-6 text-sm text-ink-2">
        No account?{" "}
        <Link href="/signup" className="text-ink shadow-[inset_0_-1px_0_var(--color-hair)] hover:text-ink hover:shadow-[inset_0_-2px_0_var(--color-gold-br)]">
          Create an account
        </Link>
      </p>
    </div>
  );
}
