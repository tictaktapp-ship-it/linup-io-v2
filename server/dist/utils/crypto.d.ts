/**
 * LINUP v2 - server/src/utils/crypto.ts
 * AES-256-GCM encryption for member_prompts and project_secrets.
 * Storage format: [ 12 bytes IV ][ ciphertext ][ 16 bytes GCM auth tag ]
 * Supabase returns BYTEA as hex string prefixed with \x - handled in decrypt.
 */
export declare function encryptSecret(plaintext: string): Buffer;
export declare function decryptSecret(data: Buffer | string): string;
export declare function encryptPrompt(plaintext: string): Buffer;
export declare function decryptPrompt(data: Buffer | string): string;
//# sourceMappingURL=crypto.d.ts.map