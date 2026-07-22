import { describe, it, expect } from "vitest";
import type { LicensePayload } from "@rihla-mate/shared";
import { generateKeyPair, signPayload, verifyKey } from "../signing.js";

function makePayload(overrides: Partial<LicensePayload> = {}): LicensePayload {
  return {
    licenseId: "lic_test",
    customerId: "cust_test",
    customerName: "Test Customer",
    plan: "pro",
    features: ["booking_engine", "custom_domain"],
    maxTenants: 1,
    maxMonthlyBookings: 100,
    expiresAt: "2099-12-31T00:00:00.000Z",
    gracePeriodDays: 7,
    isTrial: false,
    trialDays: 0,
    apiUrl: "https://license.example.com",
    ...overrides,
  };
}

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
    const payload = makePayload({ licenseId: "lic_roundtrip" });

    const signed = await signPayload(payload, privateKey);
    const result = await verifyKey(signed, publicKey);

    expect(result.valid).toBe(true);
    expect(result.payload).toEqual(payload);
  });

  it("rejects tampered payload", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = makePayload({ licenseId: "lic_tamper" });

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
    const payload = makePayload({ licenseId: "lic_wrong_key" });

    const signed = await signPayload(payload, key1.privateKey);

    // Verify with key2's public key
    const result = await verifyKey(signed, key2.publicKey);
    expect(result.valid).toBe(false);
  });
});

describe("edge cases", () => {
  it("minimal valid payload round-trip works", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = makePayload({
      customerName: "",
      features: [],
      maxTenants: 0,
      maxMonthlyBookings: 0,
      trialDays: 0,
    });

    const signed = await signPayload(payload, privateKey);
    const result = await verifyKey(signed, publicKey);

    expect(result.valid).toBe(true);
    expect(result.payload).toEqual(payload);
  });
});

describe("base64url (tested via sign/verify)", () => {
  it("non-ASCII byte values round-trip through sign/verify", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = makePayload({
      customerName: "test-\u0000\u0001\u00fe\u00ff",
    });

    const signed = await signPayload(payload, privateKey);
    const result = await verifyKey(signed, publicKey);

    expect(result.valid).toBe(true);
    expect(result.payload).toEqual(payload);
  });
});
