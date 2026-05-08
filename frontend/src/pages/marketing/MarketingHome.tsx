import { useEffect } from 'react';
import { MarketingNav } from '../../components/marketing/MarketingNav';
import { HeroSection } from '../../components/marketing/HeroSection';
import { PipelinePreview } from '../../components/marketing/PipelinePreview';
import { TeamGrid } from '../../components/marketing/TeamGrid';
import { HowItWorks } from '../../components/marketing/HowItWorks';
import { TrustSignals } from '../../components/marketing/TrustSignals';
import { PricingPreview } from '../../components/marketing/PricingPreview';
import { MarketingFooter } from '../../components/marketing/MarketingFooter';

// Doc 5 Screen 1 — Marketing Home (/)
// SEO: title, meta description, OG tags, canonical, Organization schema, robots: index follow

const SEO = {
  title: 'LINUP — AI Engineering Department for Non-Technical Founders',
  description: 'LINUP runs a full-stack AI engineering department that produces a complete, production-ready app specification. Free first project.',
  ogTitle: 'LINUP — Specify your app before a line of code is written',
  canonical: 'https://linup.io/',
};

export function MarketingHome() {
  useEffect(() => {
    // Title
    document.title = SEO.title;

    // Meta description
    let desc = document.querySelector('meta[name="description"]');
    if (!desc) { desc = document.createElement('meta'); desc.setAttribute('name', 'description'); document.head.appendChild(desc); }
    desc.setAttribute('content', SEO.description);

    // OG title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
    ogTitle.setAttribute('content', SEO.ogTitle);

    // OG description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) { ogDesc = document.createElement('meta'); ogDesc.setAttribute('property', 'og:description'); document.head.appendChild(ogDesc); }
    ogDesc.setAttribute('content', SEO.description);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', SEO.canonical);

    // Robots
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots); }
    robots.setAttribute('content', 'index, follow');

    // Organization structured data
    const existingLd = document.querySelector('script[data-ld="organization"]');
    if (!existingLd) {
      const ld = document.createElement('script');
      ld.setAttribute('type', 'application/ld+json');
      ld.setAttribute('data-ld', 'organization');
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'LINUP',
        url: 'https://linup.io',
        logo: 'https://linup.io/logo.png',
      });
      document.head.appendChild(ld);
    }

    return () => {
      // Clean up structured data on unmount
      const ld = document.querySelector('script[data-ld="organization"]');
      if (ld) ld.remove();
    };
  }, []);

  return (
    <div style={{ background: 'var(--color-dark-0)', minHeight: '100vh' }}>
      <MarketingNav />
      <main>
        <HeroSection />
        <PipelinePreview />
        <TeamGrid />
        <HowItWorks />
        <TrustSignals />
        <PricingPreview />
      </main>
      <MarketingFooter />
    </div>
  );
}