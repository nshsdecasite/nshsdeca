"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { SocialHeader, SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem } from "@/lib/motion-variants";

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
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="social-page-glow pointer-events-none" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {schoolName}
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Train smarter for DECA competitions
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                {chapterName} members can practice roleplays, take tests, study
                Performance Indicators, and track progress — all in one place.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/signup">Create your account</Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="rounded-2xl bg-black p-6 shadow-border-hover">
                <Logo className="h-16 w-auto sm:h-20" priority />
              </div>
            </div>
          </div>
        </div>
      </section>

      <SocialPage size="wide">
        <SocialHeader
          eyebrow="Platform"
          title="Everything you need to prepare"
          description="Built for students, officers, and advisors throughout the competition season."
        />

        <motion.ul
          className="grid gap-4 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {features.map((feature) => (
            <motion.li key={feature.title} variants={staggerItem}>
              <SocialPanel interactive>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </SocialPanel>
            </motion.li>
          ))}
        </motion.ul>
      </SocialPage>

      <section className="border-t border-border/60 bg-primary px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
              Ready to get started?
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/80 sm:text-base">
              Create a student account, sign in, and explore everything the
              platform offers from your dashboard.
            </p>
          </div>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
