/**
 * AES-GCM Encryption Utility for frontend tokens
 * Focuses on preventing plain-text storage and transmission.
 */

const SECRET_PASS = "AlManer-Secure-Key-2025-PW-Clone";

async function getCryptoKey(password: string) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("almaner-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptToken(token: string): Promise<string> {
  try {
    const cryptoKey = await getCryptoKey(SECRET_PASS);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedToken = new TextEncoder().encode(token);

    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encodedToken
    );

    const encryptedArray = new Uint8Array(encryptedContent);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error("Encryption failed:", err);
    return token; // fallback to plain if it fails, though not ideal
  }
}

export async function decryptToken(encryptedBase64: string): Promise<string> {
  try {
    const cryptoKey = await getCryptoKey(SECRET_PASS);
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encryptedContent = combined.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encryptedContent
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (err) {
    console.error("Decryption failed:", err);
    return encryptedBase64; // return original if fail
  }
}
