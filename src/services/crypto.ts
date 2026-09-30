import { EncryptedData, Note } from '../types/note';

/**
 * Web Crypto API End-to-End Encryption (AES-GCM 256-bit with PBKDF2)
 * Ensures true Zero-Knowledge privacy: plain notes never leave device memory.
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM 256 key from passphrase + salt using PBKDF2
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive note fields (title, content, todos, imageUrl, caption, tags)
 */
export async function encryptNotePayload(
  payload: {
    title: string;
    content: string;
    todos: any[];
    imageUrl?: string;
    caption?: string;
    tags: string[];
  },
  passphrase: string
): Promise<EncryptedData> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const jsonStr = JSON.stringify(payload);
  const enc = new TextEncoder();
  const encodedData = enc.encode(jsonStr);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedData
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
    version: 1,
  };
}

/**
 * Decrypt note payload with passphrase
 */
export async function decryptNotePayload(
  encryptedData: EncryptedData,
  passphrase: string
): Promise<{
  title: string;
  content: string;
  todos: any[];
  imageUrl?: string;
  caption?: string;
  tags: string[];
}> {
  const salt = new Uint8Array(base64ToArrayBuffer(encryptedData.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv));
  const ciphertextBuffer = base64ToArrayBuffer(encryptedData.ciphertext);

  const key = await deriveKey(passphrase, salt);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuffer);
  return JSON.parse(jsonStr);
}

/**
 * Hash passphrase with a salt for checking vault unlock password
 */
export async function hashPassphrase(passphrase: string, saltBase64?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltBase64 ? new Uint8Array(base64ToArrayBuffer(saltBase64)) : window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const exported = await window.crypto.subtle.exportKey('raw', key).catch(() => null);

  // If key isn't extractable, we derive a verification tag
  const enc = new TextEncoder();
  const verifyData = enc.encode('magnific-space-vault-verification');
  const iv = new Uint8Array(12); // constant IV for verification check
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    verifyData
  );

  return {
    hash: arrayBufferToBase64(encrypted),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

/**
 * Verify if provided passphrase matches stored verification hash
 */
export async function verifyPassphrase(passphrase: string, salt: string, expectedHash: string): Promise<boolean> {
  try {
    const res = await hashPassphrase(passphrase, salt);
    return res.hash === expectedHash;
  } catch (err) {
    return false;
  }
}
