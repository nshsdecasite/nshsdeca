import type { NextConfig } from "next";
import path from "path";
import { getSiteUrl } from "./lib/site-url";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/^http:\/\//i, "https://");

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: getSiteUrl(),
    NEXT_PUBLIC_CHAPTER_NAME: process.env.CHAPTER_NAME,
    NEXT_PUBLIC_CHAPTER_SCHOOL_NAME: process.env.CHAPTER_SCHOOL_NAME,
  },
};

export default nextConfig;
