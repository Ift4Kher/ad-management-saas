/**
 * Token Encryption Utility (AES-256-GCM)
 *
 * Encrypts and decrypts third-party OAuth access/refresh tokens at rest.
 * Uses Node.js native `crypto` module with AES-256-GCM authenticated encryption.
 *
 * Requirements:
 * - TOKEN_ENCRYPTION_KEY environment variable must be 64 hex characters (32 bytes).
 * - Format produced: "v1:<ivHex>:<authTagHex>:<ciphertextHex>"
 * - Throws error if key is invalid, missing, or if decryption/auth tag check fails.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // Standard 96-bit IV for GCM
const VERSION_PREFIX = 'v1';

/**
 * Get and validate the 32-byte encryption key from environment variable.
 */
function getEncryptionKey(): Buffer {
  const hexKey = process.env.TOKEN_ENCRYPTION_KEY;

  if (!hexKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not configured.');
  }

  if (hexKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).');
  }

  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypt a plaintext token using AES-256-GCM.
 *
 * @param plainText The OAuth access or refresh token string to encrypt.
 * @returns Encrypted string in format "v1:<ivHex>:<authTagHex>:<ciphertextHex>"
 */
export function encryptToken(plainText: string): string {
  if (!plainText) {
    throw new Error('Cannot encrypt empty or null token string.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encryptedBuffer = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${VERSION_PREFIX}:${iv.toString('hex')}:${authTag.toString('hex')}:${encryptedBuffer.toString('hex')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted token string.
 *
 * @param encryptedText Encrypted string in format "v1:<ivHex>:<authTagHex>:<ciphertextHex>"
 * @returns Decrypted original plaintext token string.
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error('Cannot decrypt empty or null encrypted string.');
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
    throw new Error('Invalid encrypted token format.');
  }

  const [, ivHex, authTagHex, ciphertextHex] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  if (iv.length !== IV_LENGTH_BYTES || authTag.length !== 16) {
    throw new Error('Invalid IV or AuthTag length in encrypted token.');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decryptedBuffer = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decryptedBuffer.toString('utf8');
  } catch (err) {
    throw new Error(`Failed to decrypt token: ${err instanceof Error ? err.message : 'Authentication tag verification failed'}`);
  }
}
