"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type AuthActionState } from "@/app/auth/actions";
import { DecaButton } from "@/components/deca/button";
import { Logo } from "@/components/logo";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <DecaButton type="submit" disabled={pending} className="mt-1.5 w-full">
      {pending ? "Signing in" : "Sign in"}
    </DecaButton>
  );
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl bg-white px-10 py-11 shadow-card">
        <div className="flex justify-center">
          <Logo className="no-outline h-12 w-auto" priority />
        </div>
        <h1 className="mt-8 text-center font-display text-[30px] font-black tracking-[-0.03em]">
          Welcome back
        </h1>
        <p className="mt-2 text-center text-sm text-ink-2">
          Sign in with your username. The first time, that is your first and last name together, like thinhphan.
        </p>

        <form action={formAction} className="mt-7 flex flex-col gap-4">
          <input type="hidden" name="next" value={nextPath ?? "/dashboard"} />
          <div>
            <label htmlFor="username" className="mb-[7px] block text-xs font-bold text-ink-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className="deca-field"
            />
          </div>
          <div>
            <div className="mb-[7px] flex items-center justify-between gap-3">
              <label htmlFor="password" className="text-xs font-bold text-ink-2">
                Password
              </label>
              <Link
                href="/login/forgot-password"
                className="text-xs font-bold text-ever-dk hover:text-acc-deep"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="deca-field pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-extrabold text-ever-dk"
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
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
