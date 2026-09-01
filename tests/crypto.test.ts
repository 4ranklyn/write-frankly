import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bufferToBase64,
  base64ToUint8Array,
  generateRandomBytes,
  deriveKeyFromPassphrase,
  encryptText,
  decryptText,
} from '../lib/crypto.ts';

// Polyfill window.crypto in node test environment if needed
if (typeof window === 'undefined') {
  (global as unknown as { window: { crypto: Crypto } }).window = {
    crypto: globalThis.crypto,
  };
}

describe('Web Crypto Test Suite', () => {
  it('Base64 Encoding and Decoding round-trip', () => {
    const raw = new Uint8Array([0, 1, 2, 255, 128, 64, 32]);
    const b64 = bufferToBase64(raw);
    const decoded = base64ToUint8Array(b64);
    assert.deepEqual(Array.from(decoded), Array.from(raw));
  });

  it('Random byte generation', () => {
    const bytes1 = generateRandomBytes(16);
    const bytes2 = generateRandomBytes(16);
    assert.equal(bytes1.length, 16);
    assert.equal(bytes2.length, 16);
    // Two random generations should not match
    assert.notDeepEqual(Array.from(bytes1), Array.from(bytes2));
  });

  it('AES-GCM Key Derivation and Encryption/Decryption Round-Trip', async () => {
    const passphrase = 'SuperSecretUserPassword123!';
    const salt = generateRandomBytes(16);
    const secretJournalEntry = 'Today was intense. I finally confronted my fear of public speaking.';

    const key = await deriveKeyFromPassphrase(passphrase, salt);
    assert.ok(key, 'CryptoKey should be derived');

    // Encrypt
    const encrypted = await encryptText(secretJournalEntry, key);
    assert.ok(encrypted.ciphertext, 'Ciphertext should exist');
    assert.ok(encrypted.iv, 'IV should exist');
    assert.notEqual(encrypted.ciphertext, secretJournalEntry, 'Ciphertext must not be plaintext');

    // Decrypt
    const decrypted = await decryptText(encrypted.ciphertext, encrypted.iv, key);
    assert.equal(decrypted, secretJournalEntry, 'Decrypted text must match original plaintext exactly');
  });

  it('Decryption with incorrect key should fail', async () => {
    const salt = generateRandomBytes(16);
    const key1 = await deriveKeyFromPassphrase('PasswordA', salt);
    const key2 = await deriveKeyFromPassphrase('PasswordB', salt);

    const encrypted = await encryptText('Top secret data', key1);
    await assert.rejects(
      async () => {
        await decryptText(encrypted.ciphertext, encrypted.iv, key2);
      },
      /operation failed|OperationError/i
    );
  });
});
