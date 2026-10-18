import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/constants/site";

// Canonical, indexable public pages only. Private dashboard, token-based and recovery routes are excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: route === "/" ? SITE_URL : `${SITE_URL}${route}`,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/signin" || route === "/signup" ? 0.5 : 0.7,
  }));
}
