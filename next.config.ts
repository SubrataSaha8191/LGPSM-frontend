import type { NextConfig } from "next";

// Authenticated app sections and personal invitation links must never be indexed. This complements
// robots.txt (crawl guidance only) and the middleware/auth checks (the actual access control).
const PRIVATE_SECTIONS =
  "(dashboard|events|user-management|event-organizer|earnings|reports|settings|templates|notification|notifications|billing|invitation)";

// The only remote image origin the app serves from is the backend (uploaded media). Every dynamic
// next/image in the app is `unoptimized`, so the image optimizer never needs to proxy arbitrary hosts;
// a wildcard here would let it fetch any URL (SSRF/bandwidth-abuse surface), so keep this allowlist tight.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://lgpsm-backend.onrender.com";
const apiHost = new URL(apiUrl).hostname;
const apiOrigin = new URL(apiUrl).origin;

// Enforced now: directives that cannot break page rendering but close clickjacking, <base> hijack,
// plugin and cross-site form-post vectors.
const ENFORCED_CSP = "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'";

// Full policy, delivered report-only until it has been exercised against every authenticated screen on
// staging. Next.js emits inline bootstrap scripts, so 'unsafe-inline' is required until nonces are adopted;
// even so it blocks loading script, frames and connections from origins the app does not use.
const REPORT_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  `img-src 'self' data: blob: ${apiOrigin} https://*.googleusercontent.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://accounts.google.com`,
  "frame-src https://accounts.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: apiHost,
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: ENFORCED_CSP },
          { key: "Content-Security-Policy-Report-Only", value: REPORT_ONLY_CSP },
          { key: "Permissions-Policy", value: "microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        source: `/${PRIVATE_SECTIONS}/:path*`,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/pages/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
