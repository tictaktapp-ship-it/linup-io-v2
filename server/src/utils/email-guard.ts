import dns from 'dns';

// disposable-email-domains is a JSON module — must use createRequire under NodeNext
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const disposableDomains: string[] = require('disposable-email-domains');

// Block known throwaway email domains on signup (Doc 3: Free Tier Abuse Prevention)
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  return disposableDomains.includes(domain);
}

// Verify domain has valid MX records (Doc 3: Free Tier Abuse Prevention)
export async function hasValidMxRecord(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;
  try {
    const records = await dns.promises.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}