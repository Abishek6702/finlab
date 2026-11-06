import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import TrustSection from '../components/landing/TrustSection';
import Features from '../components/landing/Features';
import ProductShowcase from '../components/landing/ProductShowcase';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import SecuritySection from '../components/landing/SecuritySection';
import FAQ from '../components/landing/FAQ';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/landing/Footer';

export default function HomePage() {
  return (
    <>
      {/* Accessible skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* A. Navigation Bar */}
      <Navbar />

      {/* Main semantic content */}
      <main id="main-content" className="flex-1 flex flex-col">
        {/* B. Hero Section */}
        <Hero />

        {/* C. Trust / Value Proposition Section */}
        <TrustSection />

        {/* D. Features Section */}
        <Features />

        {/* E. Product Showcase Section */}
        <ProductShowcase />

        {/* F. How It Works Section */}
        <HowItWorks />

        {/* G. Benefits Section */}
        <Benefits />

        {/* H. Privacy & Security Section */}
        <SecuritySection />

        {/* I. FAQ Section */}
        <FAQ />

        {/* J. Final CTA Section */}
        <FinalCTA />
      </main>

      {/* K. Footer */}
      <Footer />
    </>
  );
}
