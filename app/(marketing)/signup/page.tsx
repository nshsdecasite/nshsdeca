import type { Metadata } from "next";
import { SignupForm, SignupIntro } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center px-4 py-12 sm:px-6">
      <div className="grid w-full gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
        <SignupIntro />
        <SignupForm />
      </div>
    </div>
  );
}
