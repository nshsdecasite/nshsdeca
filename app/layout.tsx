import type { Metadata } from "next";
import { Archivo, Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
  weight: ["400", "500", "600"],
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
  weight: ["600", "800"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
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
    <html
      lang="en"
      className={`${archivo.variable} ${bricolage.variable} ${plexMono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
