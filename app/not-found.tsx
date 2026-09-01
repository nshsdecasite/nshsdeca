import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        That link doesn’t exist. Go back to the dashboard.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
