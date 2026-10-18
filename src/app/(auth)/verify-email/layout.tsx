import type { Metadata } from "next";
import { noIndexMetadata } from "@/utils/seo";

export const metadata: Metadata = noIndexMetadata("Verify your email");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
