import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  signPayload,
  verifyKey,
} from "../signing.js";

describe("generateKeyPair", () => {
  it("produces Uint8Array keys of correct length", async () => {
    const { publicKey, privateKey } = await generateKeyPair();

    expect(privateKey).toBeInstanceOf(Uint8Array);
    expect(publicKey).toBeInstanceOf(Uint8Array);
    expect(privateKey.byteLength).toBe(32);
    expect(publicKey.byteLength).toBe(32);
  });
});

describe("signPayload + verifyKey", () => {
  it("round-trip: sign a payload and verify with correct public key returns valid", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = { licenseKey: "test-123", issuedAt: new Date().toISOString() };

    const signed = await signPayload(payload, privateKey);
    const result = await verifyKey(signed, publicKey);

    expect(result.valid).toBe(true);
    expect(result.payload).toEqual(payload);
  });

  it("rejects tampered payload", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = { licenseKey: "test-123", issuedAt: new Date().toISOString() };

    const signed = await signPayload(payload, privateKey);

    // Tamper with the payload portion of the signed string
    const parts = signed.split(".");
    const tamperedPayload = parts[1].replace(/a/g, "b");
    const tamperedSigned = [parts[0], tamperedPayload, parts[2]].join(".");

    const result = await verifyKey(tamperedSigned, publicKey);
    expect(result.valid).toBe(false);
  });

  it("rejects payload signed with a different key", async () => {
    const key1 = await generateKeyPair();
    const key2 = await generateKeyPair();
    const payload = { licenseKey: "test-123", issuedAt: new Date().toISOString() };

    const signed = await signPayload(payload, key1.privateKey);

    // Verify with key2's public key
    const result = await verifyKey(signed, key2.publicKey);
    expect(result.valid).toBe(false);
  });
});

describe("edge cases", () => {
  it("empty payload round-trip works", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = {};

    const signed = await signPayload(payload, privateKey);
    const result = await verifyKey(signed, publicKey);

    expect(result.valid).toBe(true);
    expect(result.payload).toEqual(payload);
  });
});

describe("base64url (tested via sign/verify)", () => {
  it("non-ASCII byte values round-trip through sign/verify", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = { licenseKey: "test-\x00\x01\xfe\xff" };

    const signed = await signPayload(payload, privateKey);
    const result = await verifyKey(signed, publicKey);

    expect(result.valid).toBe(true);
    expect(result.payload).toEqual(payload);
  });
});
