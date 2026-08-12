"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUp, type AuthActionState } from "@/app/auth/actions";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};
const chapterName = process.env.NEXT_PUBLIC_CHAPTER_NAME ?? "Newman Smith DECA";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full">
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, initialState);

  if (state.message) {
    return (
      <Card className="shadow-border-hover">
        <CardContent className="pt-6">
          <div className="rounded-2xl bg-primary/10 px-4 py-3">
            <p className="text-sm font-semibold text-primary">Account created</p>
            <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          </div>
          <Button asChild className="mt-6">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-border-hover">
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Sign up with your school email to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <Label htmlFor="gradeLevel">Grade level</Label>
            <select
              id="gradeLevel"
              name="gradeLevel"
              required
              defaultValue=""
              className={cn(
                "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function SignupIntro() {
  return (
    <div className="max-w-xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        Join {chapterName}
      </p>
      <h1 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
        Create your student account
      </h1>
      <p className="mt-4 text-muted-foreground">
        Sign up with your school email to access roleplay practice, tests, study
        tools, and progress tracking.
      </p>
    </div>
  );
}
