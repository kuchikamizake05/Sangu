import styles from "@/components/landing/landing.module.css";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { Ticker } from "@/components/landing/ticker";
import { RateSection } from "@/components/landing/rate-section";
import { Testimonials } from "@/components/landing/testimonials";
import { Features } from "@/components/landing/features";
import { Security } from "@/components/landing/security";
import { Support } from "@/components/landing/support";
import { DownloadCta } from "@/components/landing/download-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return <div className={styles.page}>
    <LandingNav />
    <main>
      <Hero />
      <Ticker />
      <RateSection />
      <Testimonials />
      <Features />
      <Security />
      <Support />
      <DownloadCta />
    </main>
    <LandingFooter />
  </div>;
}
