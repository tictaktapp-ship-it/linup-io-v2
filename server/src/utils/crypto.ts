/**
 * LINUP v2 - server/src/utils/crypto.ts
 * AES-256-GCM encryption for member_prompts and project_secrets.
 * Storage format: [ 12 bytes IV ][ ciphertext ][ 16 bytes GCM auth tag ]
 * Supabase returns BYTEA as hex string prefixed with \x - handled in decrypt.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function resolveKey(hexKey: string, context: 'secrets' | 'prompts'): Buffer {
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) {
    throw new Error(`[crypto] ${context} key must be 32 bytes (64 hex chars). Got ${key.length} bytes.`);
  }
  return key;
}

function toBuffer(data: Buffer | string | object): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === 'string') {
    // Supabase returns BYTEA as hex string prefixed with \x
    const hex = data.startsWith('\\x') ? data.slice(2) : data;
    const buf = Buffer.from(hex, 'hex');
    // Check if the decoded data is a JSON-serialized Buffer: {"type":"Buffer","data":[...]}
    try {
      const parsed = JSON.parse(buf.toString('utf8'));
      if (parsed && parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
        return Buffer.from(parsed.data);
      }
    } catch { /* not JSON — use raw bytes */ }
    return buf;
  }
  // Handle object form {type:'Buffer',data:[...]}
  if (typeof data === 'object' && (data as any).type === 'Buffer') {
    return Buffer.from((data as any).data);
  }
  throw new Error('[crypto] Unexpected data type: ' + typeof data);
}

// ---------------------------------------------------------------------------
// Project Secrets - encrypted with SECRETS_ENCRYPTION_KEY
// ---------------------------------------------------------------------------

export function encryptSecret(plaintext: string): Buffer {
  const hexKey = process.env.SECRETS_ENCRYPTION_KEY;
  if (!hexKey) throw new Error('[crypto] SECRETS_ENCRYPTION_KEY is not set');
  const key = resolveKey(hexKey, 'secrets');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]);
}

export function decryptSecret(data: Buffer | string): string {
  const hexKey = process.env.SECRETS_ENCRYPTION_KEY;
  if (!hexKey) throw new Error('[crypto] SECRETS_ENCRYPTION_KEY is not set');
  const key = resolveKey(hexKey, 'secrets');
  const buf = toBuffer(data);
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// ---------------------------------------------------------------------------
// Member Prompts - encrypted with ENCRYPTION_KEY
// ---------------------------------------------------------------------------

export function encryptPrompt(plaintext: string): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) throw new Error('[crypto] ENCRYPTION_KEY is not set');
  const key = resolveKey(hexKey, 'prompts');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]);
}

export function decryptPrompt(data: Buffer | string): string {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) throw new Error('[crypto] ENCRYPTION_KEY is not set');
  const key = resolveKey(hexKey, 'prompts');
  const buf = toBuffer(data);
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}