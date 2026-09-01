import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    </div>
  );
}
