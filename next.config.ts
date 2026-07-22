import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.SITE_URL,
    NEXT_PUBLIC_CHAPTER_NAME: process.env.CHAPTER_NAME,
    NEXT_PUBLIC_CHAPTER_SCHOOL_NAME: process.env.CHAPTER_SCHOOL_NAME,
  },
};

export default nextConfig;
