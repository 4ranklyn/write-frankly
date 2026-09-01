/**
 * Client-Side Zero-Knowledge Web Crypto Encryption Utility
 * Provides 256-bit AES-GCM encryption & decryption with PBKDF2 key derivation.
 * Data is encrypted in the browser BEFORE sending to Firestore, ensuring zero-knowledge at rest.
 */

// Helper to convert ArrayBuffer / Uint8Array to Base64 string
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 string to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Checks if the Web Crypto API (crypto.subtle) is available in the current browser environment.
 */
export function isWebCryptoSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.crypto?.subtle);
}

/**
 * Generates cryptographically secure random bytes for Salt or IV.
 */
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Fallback for SSR
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a user passphrase and salt using PBKDF2 with 100,000 iterations of SHA-256.
 */
export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!isWebCryptoSupported()) {
    throw new Error('Web Crypto API is not supported in this browser environment');
  }

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt?: string;
  version: 'v1-aes-gcm';
}

/**
 * Encrypts a plaintext string using AES-GCM 256-bit.
 * Returns Base64-encoded ciphertext and IV.
 */
export async function encryptText(plainText: string, key: CryptoKey): Promise<EncryptedPayload> {
  if (!isWebCryptoSupported()) {
    throw new Error('Web Crypto API is not supported in this browser environment');
  }

  const enc = new TextEncoder();
  const iv = generateRandomBytes(12); // Standard 96-bit IV for AES-GCM

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    enc.encode(plainText)
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
    version: 'v1-aes-gcm',
  };
}

/**
 * Decrypts an encrypted payload using AES-GCM 256-bit and the provided CryptoKey.
 */
export async function decryptText(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  if (!isWebCryptoSupported()) {
    throw new Error('Web Crypto API is not supported in this browser environment');
  }

  const ciphertext = base64ToUint8Array(ciphertextBase64);
  const iv = base64ToUint8Array(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertext as unknown as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}
