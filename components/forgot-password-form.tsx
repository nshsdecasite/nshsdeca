"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, type AuthActionState } from "@/app/auth/actions";
import { DecaButton } from "@/components/deca/button";
import { Logo } from "@/components/logo";

const initialState: AuthActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <DecaButton type="submit" disabled={pending} className="mt-2 w-full" size="lg">
      {pending ? "Sending" : label}
    </DecaButton>
  );
}

export function ForgotPasswordForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [lastName, setLastName] = useState("");
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  if (state.message && step === 2) {
    return (
      <div className="grid min-h-[calc(100vh-3rem)] overflow-hidden rounded-[20px] bg-white shadow-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="relative flex flex-col justify-between bg-ever-dk px-10 py-12 text-white lg:px-12 lg:py-14">
          <Logo className="no-outline h-[2.125rem] w-auto brightness-0 invert" priority />
          <p className="max-w-[32ch] text-sm leading-[1.6] text-white/85">
            Password reset links expire after a short time. Check spam if you do not
            see the email within a few minutes.
          </p>
        </div>
        <div className="flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-14">
          <Link
            href="/login"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-bold text-ever-dk hover:text-acc-deep"
          >
            <span aria-hidden>←</span> Back to sign in
          </Link>
          <h2 className="font-display text-[34px] font-black tracking-[-0.03em] text-ink">
            Check your email
          </h2>
          <p className="mt-3 text-sm leading-[1.6] text-ink-2">{state.message}</p>
          <DecaButton href="/login" className="mt-8 w-full" size="lg">
            Return to sign in
          </DecaButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-3rem)] overflow-hidden rounded-[20px] bg-white shadow-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative flex flex-col justify-between bg-ever-dk px-10 py-12 text-white lg:px-12 lg:py-14">
        <div>
          <Logo className="no-outline h-[2.125rem] w-auto brightness-0 invert" priority />
          <h1 className="mt-12 max-w-[16ch] font-display text-[40px] font-black leading-[0.95] tracking-[-0.04em]">
            Reset your password
          </h1>
          <p className="mt-5 max-w-[36ch] text-sm leading-[1.6] text-white/85">
            Verify your chapter account, then we&apos;ll send a secure link to choose a
            new password.
          </p>
        </div>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.08em] text-white/60 lg:mt-0">
          Work in progress · verification step
        </p>
      </div>

      <div className="flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-14">
        <Link
          href="/login"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-bold text-ever-dk hover:text-acc-deep"
        >
          <span aria-hidden>←</span> Back to sign in
        </Link>

        {step === 1 ? (
          <>
            <h2 className="font-display text-[34px] font-black tracking-[-0.03em] text-ink">
              Step 1 · Confirm email
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              Enter the school email tied to your chapter account.
            </p>
            <form
              className="mt-8 flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get("email");
                if (typeof value === "string" && value.trim()) {
                  setEmail(value.trim());
                  setStep(2);
                }
              }}
            >
              <div>
                <label htmlFor="email" className="mb-[7px] block text-xs font-bold text-ink-2">
                  School email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={email}
                  placeholder="you@student.cfbisd.edu"
                  required
                  className="deca-field"
                />
              </div>
              <DecaButton type="submit" size="lg" className="w-full">
                Continue
              </DecaButton>
            </form>
          </>
        ) : (
          <>
            <h2 className="font-display text-[34px] font-black tracking-[-0.03em] text-ink">
              Step 2 · Verify identity
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              Confirm your last name matches our chapter roster for{" "}
              <span className="font-semibold text-ink">{email}</span>.
            </p>
            <form action={formAction} className="mt-8 flex flex-col gap-4">
              <input type="hidden" name="email" value={email} />
              <div>
                <label
                  htmlFor="lastName"
                  className="mb-[7px] block text-xs font-bold text-ink-2"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  className="deca-field"
                />
              </div>
              {state.error ? (
                <p className="text-sm leading-[1.6] text-[#b42318]">{state.error}</p>
              ) : null}
              <SubmitButton label="Send reset link" />
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-bold text-ever-dk hover:text-acc-deep"
              >
                Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
