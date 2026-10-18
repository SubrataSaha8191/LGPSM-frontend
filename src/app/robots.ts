import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";

// Crawl guidance only — not a security boundary. The private app routes below are also protected by
// middleware/auth and carry an X-Robots-Tag noindex header (see next.config.ts). Auth pages are left
// crawlable on purpose so crawlers can read their noindex metadata.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/events",
        "/user-management",
        "/event-organizer",
        "/earnings",
        "/reports",
        "/settings",
        "/templates",
        "/notification",
        "/notifications",
        "/billing",
        "/invitation/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
