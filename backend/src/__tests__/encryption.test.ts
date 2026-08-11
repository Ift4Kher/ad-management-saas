import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encryptToken, decryptToken } from '../lib/encryption.js';

const VALID_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('AES-256-GCM Token Encryption Utility', () => {
  const originalEnv = process.env.TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY_HEX;
  });

  it('should encrypt and decrypt a token successfully (round-trip)', () => {
    const rawToken = 'ya29.a0ARdaC0B_Sample_Google_OAuth_Access_Token_12345';
    const encrypted = encryptToken(rawToken);

    expect(encrypted).not.toBe(rawToken);
    expect(encrypted).toMatch(/^v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it('should produce unique ciphertexts and IVs for identical plaintexts', () => {
    const rawToken = 'same_access_token';
    const encrypted1 = encryptToken(rawToken);
    const encrypted2 = encryptToken(rawToken);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decryptToken(encrypted1)).toBe(rawToken);
    expect(decryptToken(encrypted2)).toBe(rawToken);
  });

  it('should fail decryption if ciphertext or auth tag is tampered with', () => {
    const rawToken = 'secret_refresh_token_abc123';
    const encrypted = encryptToken(rawToken);
    const parts = encrypted.split(':');

    // Tamper with ciphertext by altering last character
    const tamperedCiphertext = parts[3].slice(0, -2) + (parts[3].endsWith('00') ? '11' : '00');
    const tamperedEncrypted = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCiphertext}`;

    expect(() => decryptToken(tamperedEncrypted)).toThrow(/Failed to decrypt token/);
  });

  it('should throw an error if TOKEN_ENCRYPTION_KEY is missing', () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken('some_token')).toThrow(/TOKEN_ENCRYPTION_KEY environment variable is not configured/);
  });

  it('should throw an error if TOKEN_ENCRYPTION_KEY is invalid length', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'too_short_key';
    expect(() => encryptToken('some_token')).toThrow(/TOKEN_ENCRYPTION_KEY must be exactly 64 hexadecimal characters/);
  });
});
