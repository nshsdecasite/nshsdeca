import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="px-4 py-10 sm:px-6">
      <EmptyState
        title="Page not found"
        description="That screen isn’t in the platform. Go back to the dashboard."
        action={
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
