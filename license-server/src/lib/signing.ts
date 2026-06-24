import * as ed from "@noble/ed25519";
import type { LicensePayload } from "@rihla-mate/shared";

const KEY_PREFIX = "RML1";

function base64urlEncode(data: Uint8Array): string {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64");
}

export async function signPayload(
  payload: LicensePayload,
  privateKey: Uint8Array,
): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const payloadEncoded = new TextEncoder().encode(payloadJson);
  const signature = await ed.signAsync(payloadEncoded, privateKey);
  return [
    KEY_PREFIX,
    base64urlEncode(payloadEncoded),
    base64urlEncode(signature),
  ].join(".");
}

export async function verifyKey(
  key: string,
  publicKey: Uint8Array,
): Promise<{ valid: boolean; payload: LicensePayload | null }> {
  try {
    const parts = key.split(".");
    if (parts.length !== 3 || parts[0] !== KEY_PREFIX) {
      return { valid: false, payload: null };
    }

    const [, payloadB64, signatureB64] = parts;
    const payloadBytes = base64urlDecode(payloadB64);
    const signatureBytes = base64urlDecode(signatureB64);

    const valid = await ed.verifyAsync(signatureBytes, payloadBytes, publicKey);
    if (!valid) {
      return { valid: false, payload: null };
    }

    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadJson) as LicensePayload;

    return { valid: true, payload };
  } catch {
    return { valid: false, payload: null };
  }
}

export async function generateKeyPair(): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { publicKey, privateKey };
}
