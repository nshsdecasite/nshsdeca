"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateMyPassword,
  updateMyUsername,
  type AuthActionState,
} from "@/app/auth/actions";
import { DecaButton } from "@/components/deca/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: AuthActionState = {};

function SaveButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <DecaButton type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </DecaButton>
  );
}

function FieldMessage({ state }: { state: AuthActionState }) {
  if (state.error) {
    return <p className="text-sm leading-6 text-pretty text-[#b42318]">{state.error}</p>;
  }
  if (state.message) {
    return <p className="text-sm leading-6 text-pretty text-ever-dk">{state.message}</p>;
  }
  return null;
}

function UsernameForm({ username }: { username: string }) {
  const [state, formAction] = useActionState(updateMyUsername, initialState);
  const [value, setValue] = useState(username);

  useEffect(() => {
    setValue(username);
  }, [username]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="account-username" className="text-xs font-bold text-ink-2">
        Username
      </label>
      <input
        id="account-username"
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
      <p className="text-xs leading-[1.5] text-pretty text-mute">
        3 to 30 letters and numbers, starting with a letter. This is what you type to sign in.
      </p>
      <FieldMessage state={state} />
      <div>
        <SaveButton label="Save username" pendingLabel="Saving" />
      </div>
    </form>
  );
}

function PasswordForm() {
  const [state, formAction] = useActionState(updateMyPassword, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <label htmlFor="account-current-password" className="text-xs font-bold text-ink-2">
        Password
      </label>
      <input
        id="account-current-password"
        name="currentPassword"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        required
        placeholder="Current password"
        aria-label="Current password"
        className="deca-field"
      />
      <input
        id="account-new-password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        required
        placeholder="New password"
        aria-label="New password"
        className="deca-field"
      />
      <input
        id="account-confirm-password"
        name="confirmPassword"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        required
        placeholder="Confirm new password"
        aria-label="Confirm new password"
        className="deca-field"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-[1.5] text-pretty text-mute">At least 8 characters.</p>
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="text-xs font-extrabold text-ever-dk transition-opacity duration-150 hover:opacity-70"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      <FieldMessage state={state} />
      <div>
        <SaveButton label="Save password" pendingLabel="Saving" />
      </div>
    </form>
  );
}

export function AccountMenu({
  initials,
  username,
}: {
  initials: string;
  username: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Change username or password"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ever-lt text-sm font-extrabold text-ever-dk transition-[scale,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[#e3e9d8] hover:text-ever-dk active:scale-[0.96]"
        >
          {initials}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[420px] gap-0 overflow-y-auto rounded-3xl border-0 bg-white p-6 shadow-card sm:p-7">
        <DialogHeader className="mb-5 space-y-1 pr-8 text-left">
          <DialogTitle className="text-balance font-display text-[22px] font-black tracking-[-0.03em]">
            Your account
          </DialogTitle>
          <DialogDescription className="text-pretty text-[13px] leading-5 text-mute">
            Change the username and password you use to sign in.
          </DialogDescription>
        </DialogHeader>
        <UsernameForm username={username} />
        <div className="my-5 h-px bg-edge" />
        <PasswordForm />
      </DialogContent>
    </Dialog>
  );
}
