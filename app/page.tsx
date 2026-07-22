import Link from "next/link";
import { Logo } from "@/components/logo";

const schoolName =
  process.env.CHAPTER_SCHOOL_NAME ?? "Newman Smith High School";
const chapterName = process.env.CHAPTER_NAME ?? "Newman Smith DECA";

const features = [
  {
    title: "Practice tests",
    description:
      "Full 100-question exams, custom quizzes, and PI-targeted sessions with rationales.",
  },
  {
    title: "Roleplay practice",
    description:
      "Browse scenarios, submit video attempts, and get rubric-based officer feedback.",
  },
  {
    title: "Study tools",
    description:
      "PI browser, flashcards, vocab, theories, visuals, and personal notes.",
  },
  {
    title: "Progress & leaderboard",
    description:
      "Track PI strengths, earn points, and climb the chapter leaderboard.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-deca-green-light/40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,106,45,0.12),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center rounded-full bg-deca-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-deca-green">
                {schoolName}
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Train smarter for DECA competitions
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-muted">
                {chapterName} members can practice roleplays, take tests, study
                Performance Indicators, and track progress — all in one place.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex min-h-11 items-center rounded-2xl bg-deca-green px-6 text-sm font-semibold text-white shadow-soft-lg transition-[background-color,transform] duration-150 hover:bg-deca-green-dark active:scale-[0.96]"
                >
                  Create your account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center rounded-2xl bg-white px-6 text-sm font-semibold text-ink shadow-soft transition-[color,transform] duration-150 hover:text-deca-green active:scale-[0.96]"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="rounded-3xl bg-black p-6 shadow-soft-lg">
                <Logo className="h-16 w-auto sm:h-20" priority />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-bold text-ink">Everything you need to prepare</h2>
          <p className="mt-3 text-muted">
            Built for students, officers, and advisors throughout the
            competition season.
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="rounded-3xl bg-white p-6 shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <h3 className="text-lg font-semibold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-deca-green px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to get started?
            </h2>
            <p className="mt-3 text-sm text-green-100 sm:text-base">
              Create a student account, sign in, and explore everything the
              platform will offer from your dashboard.
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex min-h-11 shrink-0 items-center rounded-2xl bg-white px-6 text-sm font-semibold text-deca-green transition-[transform,opacity] duration-150 hover:opacity-95 active:scale-[0.96]"
          >
            Create account
          </Link>
        </div>
      </section>
    </>
  );
}
