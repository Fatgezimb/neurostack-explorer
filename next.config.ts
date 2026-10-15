import type { NextConfig } from "next";

const basePath = (process.env.PAGES_BASE_PATH ?? "").replace(/\/+$/, "");
if (basePath && (!/^\/[A-Za-z0-9_./-]+$/.test(basePath) || basePath.includes("//") || basePath.split("/").some(part => part === "." || part === ".."))) {
  throw new Error("PAGES_BASE_PATH must be a root-relative deployment path without traversal.");
}

const nextConfig: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_NEUROSTACK_BASE_PATH: basePath },
  images: { unoptimized: Boolean(basePath) },
};

export default nextConfig;
