const chapterName = process.env.CHAPTER_NAME ?? "Newman Smith DECA";
const schoolName =
  process.env.CHAPTER_SCHOOL_NAME ?? "Newman Smith High School";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {schoolName} · {chapterName}
        </p>
        <p className="text-sm text-muted-foreground">
          Built for DECA members, officers, and advisors.
        </p>
      </div>
    </footer>
  );
}
