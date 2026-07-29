import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev indicator sits bottom-left, directly on top of the Owner's sign-in
  // affordance, and swallows its clicks during development.
  devIndicators: false,
};

export default nextConfig;
