import { useSyncExternalStore, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

let pendingPath: string | null = null;
const pathListeners = new Set<() => void>();

export function rememberGhostPath(path: string | null) {
  if (pendingPath === path) return;
  pendingPath = path;
  pathListeners.forEach((listener) => listener());
}

export function peekGhostPath() {
  return pendingPath;
}

export function useNavIntent() {
  return useSyncExternalStore(
    (listener) => {
      pathListeners.add(listener);
      return () => pathListeners.delete(listener);
    },
    peekGhostPath,
    () => null,
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true" className="animate-settle">
      <p className="sr-only">Loading</p>
      {children}
    </div>
  );
}

function Heading({ lines = true }: { lines?: boolean }) {
  return (
    <div>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-10 w-72 max-w-full" />
      {lines ? <Skeleton className="mt-3 h-4 w-96 max-w-full" /> : null}
    </div>
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-[20px] border border-edge bg-white shadow-card", className)}>
      {children}
    </div>
  );
}

function DashboardGhost() {
  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Heading />
        <div className="flex gap-2.5">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="px-5 py-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-8 w-20" />
          </Card>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="px-7 py-6">
          <Skeleton className="h-5 w-40" />
          <div className="mt-5 flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full rounded-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="px-5 py-5">
          <Skeleton className="mx-2 h-5 w-28" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="px-2 py-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="mt-2 h-3 w-44" />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="h-40 px-6 py-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function LibraryGhost() {
  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Heading />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-36 rounded-full" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="flex flex-col px-7 py-6">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="mt-4 h-5 w-4/5" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
            <Skeleton className="mt-5 h-9 w-20 rounded-full" />
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function SituationGhost() {
  return (
    <Shell>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-4 h-10 w-80 max-w-full" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_22rem]">
        <Card className="px-8 py-8">
          <Skeleton className="h-5 w-36" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className={cn("h-3.5", index % 4 === 3 ? "w-2/3" : "w-full")} />
            ))}
          </div>
          <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="px-6 py-6">
            <Skeleton className="h-4 w-44" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-3.5 w-full" />
              ))}
            </div>
          </Card>
          <Card className="h-36 px-6 py-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </Card>
        </div>
      </div>
    </Shell>
  );
}

function GenerateGhost() {
  return (
    <Shell>
      <Heading />
      <Card className="mt-8 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-12 w-full rounded-2xl" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-4 w-80 max-w-full" />
        <Skeleton className="mt-5 h-3 w-20" />
        <Skeleton className="mt-2 h-11 w-56 rounded-full" />
        <Skeleton className="mt-6 h-11 w-36 rounded-full" />
      </Card>
    </Shell>
  );
}

function StudyGhost() {
  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Heading />
        <Skeleton className="h-11 w-44 rounded-full" />
      </div>
      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="px-7 py-6">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-6 w-40" />
            <Skeleton className="mt-3 h-3 w-28" />
            <Skeleton className="mt-5 h-9 w-24 rounded-full" />
          </Card>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} className="px-7 py-7">
            <Skeleton className="h-5 w-40" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 4 }, (_, row) => (
                <div key={row}>
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="mt-2 h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function ListGhost() {
  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Heading />
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-10 w-10 flex-none rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function MessagesGhost() {
  return (
    <Shell>
      <Heading />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} className="flex gap-4 px-6 py-5">
            <Skeleton className="h-11 w-11 flex-none rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-3/4" />
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-4 grid min-h-80 lg:grid-cols-[15rem_1fr]">
        <div className="space-y-3 border-b border-edge p-4 lg:border-r lg:border-b-0">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 flex-none rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-end gap-3 p-4">
          <Skeleton className="h-10 w-2/3 rounded-2xl" />
          <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </Card>
    </Shell>
  );
}

function AdminGhost() {
  return (
    <Shell>
      <Heading />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="px-5 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-16" />
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-5">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid grid-cols-[1fr_6rem_5rem] items-center gap-3">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
}

function GradeGhost() {
  return (
    <Shell>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-10 w-64" />
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="px-6 py-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="h-72 px-6 py-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-11 w-full rounded-full" />
        </Card>
      </div>
    </Shell>
  );
}

function FormGhost() {
  return (
    <Shell>
      <Heading />
      <Card className="mt-8 max-w-xl space-y-4 p-6">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-12 w-full rounded-2xl" />
          </div>
        ))}
        <Skeleton className="h-11 w-32 rounded-full" />
      </Card>
    </Shell>
  );
}

function TestsGhost() {
  return (
    <Shell>
      <Heading />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="px-6 py-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
            <Skeleton className="mt-5 h-9 w-20 rounded-full" />
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function ExamGhost() {
  return (
    <Shell>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-3 h-2 w-full rounded-full" />
      <Card className="mt-6 px-7 py-7">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-4/5" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
      </Card>
    </Shell>
  );
}

function HomeGhost() {
  return (
    <Shell>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="px-10 py-12">
          <Skeleton className="h-14 w-4/5" />
          <Skeleton className="mt-3 h-14 w-3/5" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-8 h-12 w-36 rounded-full" />
        </Card>
        <Card className="min-h-64 px-8 py-8">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}

function LoginGhost() {
  return (
    <Shell>
      <Card className="mx-auto mt-10 max-w-md space-y-4 px-7 py-8">
        <Skeleton className="mx-auto h-8 w-40" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-full" />
      </Card>
    </Shell>
  );
}

function EventsGhost() {
  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-48 rounded-full" />
      </div>
      <div className="mt-8 space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="flex items-center gap-4 px-5 py-5">
            <Skeleton className="h-12 w-12 flex-none rounded-2xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-56 max-w-full" />
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

export function PageGhost({ path }: { path: string }) {
  const page = path.split("?")[0] || "/";
  if (page === "/") return <HomeGhost />;
  if (page.startsWith("/login") || page.startsWith("/signup")) return <LoginGhost />;
  if (page.startsWith("/events")) return <EventsGhost />;
  if (page === "/dashboard") return <DashboardGhost />;
  if (page === "/roleplays") return <LibraryGhost />;
  if (page.startsWith("/roleplays/submit")) return <FormGhost />;
  if (page.startsWith("/roleplays/")) return <SituationGhost />;
  if (page.startsWith("/generate")) return <GenerateGhost />;
  if (page === "/study") return <StudyGhost />;
  if (page.startsWith("/study/")) return <ListGhost />;
  if (page.startsWith("/messages")) return <MessagesGhost />;
  if (page === "/admin/grading" || page === "/admin/generated") return <ListGhost />;
  if (page.startsWith("/admin/grading/")) return <GradeGhost />;
  if (page.startsWith("/admin")) return <AdminGhost />;
  if (page.startsWith("/profile") || page.startsWith("/notes")) return <FormGhost />;
  if (page === "/tests") return <TestsGhost />;
  if (page.startsWith("/tests/")) return <ExamGhost />;
  if (page.startsWith("/submissions/")) return <SituationGhost />;
  if (page.startsWith("/submissions")) return <ListGhost />;
  return <ListGhost />;
}
