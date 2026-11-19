import type { NextConfig } from "next";

// The deployed backend (AWS Elastic Beanstalk) is plain HTTP -- getting it
// real HTTPS would mean paying for a load balancer just for a TLS cert.
// Browsers block an HTTPS page from fetching an HTTP origin directly
// ("mixed content"), so instead the frontend calls a same-origin path and
// Vercel proxies it server-side, where that restriction doesn't apply.
const BACKEND_ORIGIN = "http://medeval-ai-prod.eba-pmf4ebnc.ap-southeast-2.elasticbeanstalk.com";

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
