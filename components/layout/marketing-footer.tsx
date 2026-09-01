const chapterName = process.env.CHAPTER_NAME ?? "Newman Smith DECA";
const schoolName =
  process.env.CHAPTER_SCHOOL_NAME ?? "Newman Smith High School";

export function MarketingFooter() {
  return (
    <footer className="mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {schoolName}
        </p>
        <p>{chapterName}</p>
      </div>
    </footer>
  );
}
