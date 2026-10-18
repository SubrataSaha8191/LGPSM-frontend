import type { Metadata } from "next";
import { noIndexMetadata } from "@/utils/seo";

// Personal invitation links carry a private token: keep them out of search and don't leak them via Referer.
export const metadata: Metadata = {
  ...noIndexMetadata("Your invitation"),
  referrer: "no-referrer",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
