import { useEffect } from 'react';
import { MarketingNav } from '../../components/marketing/MarketingNav';
import { HeroSection } from '../../components/marketing/HeroSection';
import { PipelinePreview } from '../../components/marketing/PipelinePreview';
import { TeamGrid } from '../../components/marketing/TeamGrid';
import { HowItWorks } from '../../components/marketing/HowItWorks';
import { TrustSignals } from '../../components/marketing/TrustSignals';
import { PricingPreview } from '../../components/marketing/PricingPreview';
import { MarketingFooter } from '../../components/marketing/MarketingFooter';

const SEO = {
  title: 'LINUP — AI Engineering Department for Non-Technical Founders',
  description: 'LINUP runs a full-stack AI engineering department that produces a complete, production-ready app specification. Free first project.',
  ogTitle: 'LINUP — Specify your app before a line of code is written',
  canonical: 'https://linup.io/',
};

export function MarketingHome() {
  useEffect(() => {
    document.title = SEO.title;
    const setMeta = (sel: string, attr: string, val: string, content: string) => {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, val); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', 'name', 'description', SEO.description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', SEO.ogTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', SEO.description);
    setMeta('meta[name="robots"]', 'name', 'robots', 'index, follow');
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', SEO.canonical);
  }, []);

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
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
