import type { Metadata } from "next";
import { SiteNav } from "@/components/deca/site-nav";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <>
      <SiteNav active="none" />
      <LoginForm nextPath={params.next} />
    </>
  );
}
