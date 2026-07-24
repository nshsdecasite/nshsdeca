import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const chapterName = process.env.CHAPTER_NAME ?? "Newman Smith DECA";
const schoolName =
  process.env.CHAPTER_SCHOOL_NAME ?? "Newman Smith High School";

export const metadata: Metadata = {
  title: {
    default: `${chapterName} — Training Platform`,
    template: `%s · ${chapterName}`,
  },
  description: `Practice roleplays, take tests, and track progress for ${schoolName} DECA members.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased flex flex-col">{children}</body>
    </html>
  );
}
