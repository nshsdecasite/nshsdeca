import type { Metadata } from "next";
import { SiteNav } from "@/components/deca/site-nav";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <>
      <SiteNav active="none" />
      <SignupForm />
    </>
  );
}
