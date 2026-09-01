"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow">Error</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Couldn’t load this page</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Try again, or return to the dashboard.
      </p>
      <div className="mt-6 flex gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
