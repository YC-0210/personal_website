import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev indicator sits bottom-left, directly on top of the Owner's sign-in
  // affordance, and swallows its clicks during development.
  devIndicators: false,

  /**
   * The browser checks build with a stubbed Supabase, and `NEXT_PUBLIC_*` is
   * inlined at build time, so they build somewhere else — otherwise running
   * them would leave a `.next` pointed at a Supabase that does not exist.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
