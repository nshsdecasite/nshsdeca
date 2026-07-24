"use client";

import { useState, useTransition } from "react";
import { updateMyProfile } from "@/app/platform/actions";
import type { UserProfile } from "@/lib/platform/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileFormProps = {
  profile: UserProfile;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="p-6 sm:p-8">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          setMessage("");
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            try {
              await updateMyProfile({
                firstName: String(formData.get("firstName") ?? ""),
                lastName: String(formData.get("lastName") ?? ""),
                gradeLevel: Number(formData.get("gradeLevel")),
                isPublicOnLeaderboard: formData.get("isPublicOnLeaderboard") === "on",
              });
              setMessage("Profile updated.");
            } catch (saveError) {
              setError(
                saveError instanceof Error ? saveError.message : "Could not save profile",
              );
            }
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={profile.first_name ?? ""}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={profile.last_name ?? ""}
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="gradeLevel">Grade level</Label>
          <select
            id="gradeLevel"
            name="gradeLevel"
            defaultValue={profile.grade_level ?? 9}
            className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {[9, 10, 11, 12].map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
          <input
            type="checkbox"
            name="isPublicOnLeaderboard"
            defaultChecked={profile.is_public_on_leaderboard}
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
          />
          <span className="text-sm text-foreground">Show me on the chapter leaderboard</span>
        </label>

        {message ? <p className="text-sm text-primary">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={isPending} size="lg">
          {isPending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Card>
  );
}
