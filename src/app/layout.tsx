import type { Metadata } from "next";
import { Inter, Space_Grotesk, Caveat } from "next/font/google";
import "@/styles/globals.scss";
import { AuthProvider } from "@/context/AuthContext";
import { AlertProvider } from "@/context/AlertContext";
import { PageTitleProvider } from "@/context/PageTitleContext";
import SmoothScrollProvider from "@/components/common/SmoothScrollProvider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/constants/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const DEFAULT_TITLE = "LGPSM · Digital Invitations & Event Management";
const SOCIAL_IMAGE = {
  url: "/images/home/top_hero.webp",
  width: 1713,
  height: 918,
  alt: "LGPSM digital invitations and event management",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · LGPSM",
  },
  description: `LGPSM - ${SITE_DESCRIPTION}`,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE.url],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-gray-900 selection:bg-[#FF5B22] selection:text-white">
        <AuthProvider>
          <AlertProvider>
            <PageTitleProvider>
              <SmoothScrollProvider>{children}</SmoothScrollProvider>
            </PageTitleProvider>
          </AlertProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
