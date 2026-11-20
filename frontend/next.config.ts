import type { NextConfig } from "next";

// The backend is deployed on Hugging Face Spaces (HTTPS natively), proxied
// through a same-origin Vercel rewrite so the frontend never needs CORS
// preflight for /backend/* calls.
const BACKEND_ORIGIN = "https://akshita27-medeval-ai-backend.hf.space";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${BACKEND_ORIGIN}/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
