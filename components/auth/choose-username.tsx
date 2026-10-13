"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { chooseUsername, signOut, type AuthActionState } from "@/app/auth/actions";
import { DecaButton } from "@/components/deca/button";
import { Logo } from "@/components/logo";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <DecaButton type="submit" disabled={pending} className="mt-1.5 w-full">
      {pending ? "Saving" : "Continue"}
    </DecaButton>
  );
}

export function ChooseUsername({
  username,
  name,
}: {
  username: string;
  name: string;
}) {
  const [state, formAction] = useActionState(chooseUsername, initialState);
  const [value, setValue] = useState(username);
  const [passwordChoice, setPasswordChoice] = useState<"keep" | "change">("keep");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center bg-ground px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl bg-white px-10 py-11 shadow-card">
        <div className="flex justify-center">
          <Logo className="no-outline h-12 w-auto" priority />
        </div>
        <h1 className="mt-8 text-balance text-center font-display text-[30px] font-black tracking-[-0.03em]">
          Choose your username
        </h1>
        <p className="mt-2 text-pretty text-center text-sm leading-[1.6] text-ink-2">
          {name}, you signed in as <span className="font-bold text-ink">{username}</span>.
          Pick the username you want to use from now on.
        </p>

        <form action={formAction} className="mt-7 flex flex-col gap-4">
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
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="deca-field"
            />
            <p className="mt-2 text-xs leading-[1.5] text-mute">
              3 to 30 letters and numbers, starting with a letter. You can keep {username}.
            </p>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-[7px] text-xs font-bold text-ink-2">Password</legend>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
              <input
                type="radio"
                name="passwordChoice"
                value="keep"
                checked={passwordChoice === "keep"}
                onChange={() => setPasswordChoice("keep")}
                className="size-4 accent-ever-dk"
              />
              Keep the password you were given
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
              <input
                type="radio"
                name="passwordChoice"
                value="change"
                checked={passwordChoice === "change"}
                onChange={() => setPasswordChoice("change")}
                className="size-4 accent-ever-dk"
              />
              Set a new password
            </label>
            {passwordChoice === "change" ? (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    placeholder="New password"
                    className="deca-field pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-extrabold text-ever-dk"
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="Confirm password"
                  className="deca-field"
                />
                <p className="text-xs leading-[1.5] text-mute">At least 8 characters.</p>
              </div>
            ) : null}
          </fieldset>

          {state.error ? (
            <p className="text-sm leading-[1.6] text-[#b42318]">{state.error}</p>
          ) : null}
          <SubmitButton />
        </form>

        <form action={signOut} className="mt-4">
          <DecaButton type="submit" variant="underline" className="w-full">
            Sign out
          </DecaButton>
        </form>
      </div>
    </div>
  );
}
