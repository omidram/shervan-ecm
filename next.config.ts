import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "pdf-lib", "unpdf"],
  poweredByHeader: false,
  skipMiddlewareUrlNormalize: true,
};

export default nextConfig;
