const chapterName = process.env.CHAPTER_NAME ?? "Newman Smith DECA";
const schoolName =
  process.env.CHAPTER_SCHOOL_NAME ?? "Newman Smith High School";

export function SiteFooter() {
  return (
    <footer className="border-t border-deca-green/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} {schoolName} · {chapterName}
        </p>
        <p className="text-sm text-muted">Built for DECA members, officers, and advisors.</p>
      </div>
    </footer>
  );
}
