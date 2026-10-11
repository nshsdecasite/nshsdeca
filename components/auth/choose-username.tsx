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
      {pending ? "Saving" : "Save username"}
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

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center bg-ground px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl bg-white px-10 py-11 shadow-card">
        <div className="flex justify-center">
          <Logo className="no-outline h-12 w-auto" priority />
        </div>
        <h1 className="mt-8 text-center font-display text-[30px] font-black tracking-[-0.03em]">
          Choose your username
        </h1>
        <p className="mt-2 text-center text-sm leading-[1.6] text-ink-2">
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
