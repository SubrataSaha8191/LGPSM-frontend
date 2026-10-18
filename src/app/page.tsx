import type { Metadata } from "next";
import Navbar from "@/app/navbar/Navbar";
import HeroSection from "@/components/HeroSection";
import SubHeroIntro from "@/components/SubHeroIntro";
import ApplicationSection from "@/components/ApplicationSection";
import FeaturesSection from "@/components/FeaturesSection";
import PricingSectionHome from "@/components/PricingSectionHome";
import TestimonialsSection from "@/components/TestimonialsSection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/constants/site";
import { publicPageMetadata } from "@/utils/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "LGPSM · Digital Invitations & Event Management",
  description: `LGPSM - ${SITE_DESCRIPTION}`,
  path: "/",
  absolute: true,
});

// Only facts already shown on the site: no ratings, prices, addresses or contact details are invented.
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/android-chrome-512x512.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  },
];

export default function Home() {
  return (
    <SmoothScroll>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-1">
          <HeroSection />
          <SubHeroIntro />
          <ApplicationSection />
          <FeaturesSection />
          <PricingSectionHome />
          <TestimonialsSection />
          <FaqSection />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}

