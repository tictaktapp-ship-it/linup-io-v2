/**
 * LINUP v2 — server/src/utils/crypto.ts
 *
 * Two separate encryption contexts:
 *   ENCRYPTION_KEY        — used for member_prompts (prompt storage)
 *   SECRETS_ENCRYPTION_KEY — used for project_secrets (founder API keys etc.)
 *
 * Algorithm: AES-256-GCM
 *   - 32-byte key (hex-encoded in env)
 *   - 12-byte random IV prepended to ciphertext
 *   - 16-byte auth tag appended by GCM automatically (included in output)
 *
 * Storage format (Buffer stored as BYTEA in Postgres):
 *   [ 12 bytes IV ][ ciphertext + 16-byte GCM auth tag ]
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

function resolveKey(hexKey: string, context: 'secrets' | 'prompts'): Buffer {
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `[crypto] ${context} key must be 32 bytes (64 hex chars). Got ${key.length} bytes.`
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// Project Secrets — encrypted with SECRETS_ENCRYPTION_KEY
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string for storage in project_secrets.
 * Returns a Buffer suitable for a BYTEA Postgres column.
 */
export function encryptSecret(plaintext: string): Buffer {
  const hexKey = process.env.SECRETS_ENCRYPTION_KEY;
  if (!hexKey) throw new Error('[crypto] SECRETS_ENCRYPTION_KEY is not set');
  const key = resolveKey(hexKey, 'secrets');

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Layout: IV | ciphertext | GCM tag
  return Buffer.concat([iv, encrypted, tag]);
}

/**
 * Decrypt a Buffer from a project_secrets BYTEA column.
 * Returns the original plaintext string.
 */
export function decryptSecret(data: Buffer): string {
  const hexKey = process.env.SECRETS_ENCRYPTION_KEY;
  if (!hexKey) throw new Error('[crypto] SECRETS_ENCRYPTION_KEY is not set');
  const key = resolveKey(hexKey, 'secrets');

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// ---------------------------------------------------------------------------
// Member Prompts — encrypted with ENCRYPTION_KEY
// ---------------------------------------------------------------------------

/**
 * Encrypt a prompt string for storage in member_prompts.
 * Returns a Buffer suitable for a BYTEA Postgres column.
 */
export function encryptPrompt(plaintext: string): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) throw new Error('[crypto] ENCRYPTION_KEY is not set');
  const key = resolveKey(hexKey, 'prompts');

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, tag]);
}

/**
 * Decrypt a Buffer from a member_prompts BYTEA column.
 * Returns the original plaintext string.
 */
export function decryptPrompt(data: Buffer): string {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) throw new Error('[crypto] ENCRYPTION_KEY is not set');
  const key = resolveKey(hexKey, 'prompts');

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
