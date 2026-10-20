import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
const config: NextConfig = {
  htmlLimitedBots: /.*/,
  // Deliver the small stylesheet with HTML, avoiding a render-blocking round trip.
  experimental: { inlineCss: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};
export default bundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(
  config,
);
