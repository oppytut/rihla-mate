import { describe, it, expect } from "vitest";
import { validateBooking, validatePackage } from "../utils/validation";

describe("validateBooking", () => {
  const validInput = {
    packageId: "pkg-001",
    departureDate: "2026-07-15",
    customerName: "John Doe",
    totalPrice: "1500000",
    travelers: 2,
  };

  it("returns valid for complete and correct input", () => {
    const result = validateBooking(validInput);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("returns invalid when customerName is empty", () => {
    const result = validateBooking({ ...validInput, customerName: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.customerName).toBeDefined();
  });

  it("returns invalid when customerName is whitespace only", () => {
    const result = validateBooking({ ...validInput, customerName: "   " });
    expect(result.valid).toBe(false);
    expect(result.errors.customerName).toBeDefined();
  });

  it("returns invalid when packageId is empty", () => {
    const result = validateBooking({ ...validInput, packageId: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.packageId).toBeDefined();
  });

  it("returns invalid when departureDate is empty", () => {
    const result = validateBooking({ ...validInput, departureDate: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.departureDate).toBeDefined();
  });

  it("returns invalid when totalPrice is empty", () => {
    const result = validateBooking({ ...validInput, totalPrice: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.totalPrice).toBeDefined();
  });

  it("returns invalid when totalPrice has invalid format", () => {
    const result = validateBooking({ ...validInput, totalPrice: "abc" });
    expect(result.valid).toBe(false);
    expect(result.errors.totalPrice).toBeDefined();
  });

  it("returns valid when totalPrice has decimal places", () => {
    const result = validateBooking({ ...validInput, totalPrice: "1500000.50" });
    expect(result.valid).toBe(true);
  });

  it("returns invalid when travelers is zero", () => {
    const result = validateBooking({ ...validInput, travelers: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.travelers).toBeDefined();
  });

  it("returns invalid when travelers is negative", () => {
    const result = validateBooking({ ...validInput, travelers: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors.travelers).toBeDefined();
  });

  it("returns valid when travelers is one", () => {
    const result = validateBooking({ ...validInput, travelers: 1 });
    expect(result.valid).toBe(true);
  });

  it("returns invalid when email has invalid format", () => {
    const result = validateBooking({ ...validInput, customerEmail: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.customerEmail).toBeDefined();
  });

  it("returns valid when email is valid", () => {
    const result = validateBooking({ ...validInput, customerEmail: "john@example.com" });
    expect(result.valid).toBe(true);
  });

  it("returns valid when email is empty", () => {
    const result = validateBooking({ ...validInput, customerEmail: "" });
    expect(result.valid).toBe(true);
  });

  it("returns invalid when phone has invalid format", () => {
    const result = validateBooking({ ...validInput, customerPhone: "abc" });
    expect(result.valid).toBe(false);
    expect(result.errors.customerPhone).toBeDefined();
  });

  it("returns valid when phone is valid format", () => {
    const result = validateBooking({ ...validInput, customerPhone: "+62 812-3456-7890" });
    expect(result.valid).toBe(true);
  });

  it("returns valid when phone is empty", () => {
    const result = validateBooking({ ...validInput, customerPhone: "" });
    expect(result.valid).toBe(true);
  });

  it("returns invalid when status is not a valid booking status", () => {
    const result = validateBooking({ ...validInput, status: "invalid-status" });
    expect(result.valid).toBe(false);
    expect(result.errors.status).toBeDefined();
  });

  it("returns valid when status is pending", () => {
    const result = validateBooking({ ...validInput, status: "pending" });
    expect(result.valid).toBe(true);
  });

  it("returns valid when status is confirmed", () => {
    const result = validateBooking({ ...validInput, status: "confirmed" });
    expect(result.valid).toBe(true);
  });

  it("returns valid when status is cancelled", () => {
    const result = validateBooking({ ...validInput, status: "cancelled" });
    expect(result.valid).toBe(true);
  });

  it("returns valid when status is completed", () => {
    const result = validateBooking({ ...validInput, status: "completed" });
    expect(result.valid).toBe(true);
  });

  it("returns multiple errors for multiple invalid fields", () => {
    const result = validateBooking({
      packageId: "",
      departureDate: "",
      customerName: "",
      totalPrice: "",
      travelers: 0,
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(4);
  });
});

describe("validatePackage", () => {
  const validInput = {
    title: "Bali Tour",
    slug: "bali-tour",
    price: "1500000",
    durationDays: 3,
  };

  it("returns valid for complete and correct input", () => {
    const result = validatePackage(validInput);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("returns invalid when title is empty", () => {
    const result = validatePackage({ ...validInput, title: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeDefined();
  });

  it("returns invalid when slug is empty", () => {
    const result = validatePackage({ ...validInput, slug: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.slug).toBeDefined();
  });

  it("returns invalid when slug has invalid format", () => {
    const result = validatePackage({ ...validInput, slug: "Invalid Slug!" });
    expect(result.valid).toBe(false);
    expect(result.errors.slug).toBeDefined();
  });

  it("returns invalid when slug has uppercase characters", () => {
    const result = validatePackage({ ...validInput, slug: "Bali-Tour" });
    expect(result.valid).toBe(false);
    expect(result.errors.slug).toBeDefined();
  });

  it("returns valid when slug has hyphens and lowercase", () => {
    const result = validatePackage({ ...validInput, slug: "bali-lombok-tour" });
    expect(result.valid).toBe(true);
  });

  it("returns valid when slug has numbers", () => {
    const result = validatePackage({ ...validInput, slug: "package-2026" });
    expect(result.valid).toBe(true);
  });

  it("returns invalid when price is empty", () => {
    const result = validatePackage({ ...validInput, price: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.price).toBeDefined();
  });

  it("returns invalid when price has invalid format", () => {
    const result = validatePackage({ ...validInput, price: "abc" });
    expect(result.valid).toBe(false);
    expect(result.errors.price).toBeDefined();
  });

  it("returns valid when price has decimal places", () => {
    const result = validatePackage({ ...validInput, price: "1500000.99" });
    expect(result.valid).toBe(true);
  });

  it("returns invalid when durationDays is zero", () => {
    const result = validatePackage({ ...validInput, durationDays: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.durationDays).toBeDefined();
  });

  it("returns invalid when durationDays is negative", () => {
    const result = validatePackage({ ...validInput, durationDays: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors.durationDays).toBeDefined();
  });

  it("returns valid when durationDays is one", () => {
    const result = validatePackage({ ...validInput, durationDays: 1 });
    expect(result.valid).toBe(true);
  });

  it("returns invalid when itinerary is malformed JSON", () => {
    const result = validatePackage({ ...validInput, itinerary: "{invalid}" });
    expect(result.valid).toBe(false);
    expect(result.errors.itinerary).toBeDefined();
  });

  it("returns valid when itinerary is valid JSON", () => {
    const result = validatePackage({
      ...validInput,
      itinerary: '[{"day": 1, "description": "Arrival"}]',
    });
    expect(result.valid).toBe(true);
  });

  it("returns valid when itinerary is empty string", () => {
    const result = validatePackage({ ...validInput, itinerary: "" });
    expect(result.valid).toBe(true);
  });

  it("returns invalid when inclusions is malformed JSON", () => {
    const result = validatePackage({ ...validInput, inclusions: "not json" });
    expect(result.valid).toBe(false);
    expect(result.errors.inclusions).toBeDefined();
  });

  it("returns invalid when exclusions is malformed JSON", () => {
    const result = validatePackage({ ...validInput, exclusions: "bad json" });
    expect(result.valid).toBe(false);
    expect(result.errors.exclusions).toBeDefined();
  });

  it("returns invalid when availableDates is malformed JSON", () => {
    const result = validatePackage({ ...validInput, availableDates: "[bad]" });
    expect(result.valid).toBe(false);
    expect(result.errors.availableDates).toBeDefined();
  });

  it("returns invalid when gallery is malformed JSON", () => {
    const result = validatePackage({ ...validInput, gallery: "{bad}" });
    expect(result.valid).toBe(false);
    expect(result.errors.gallery).toBeDefined();
  });

  it("returns valid when all JSON fields are valid", () => {
    const result = validatePackage({
      ...validInput,
      itinerary: '[{"day": 1}]',
      inclusions: '["Hotel"]',
      exclusions: '["Flight"]',
      availableDates: '["2026-07-01"]',
      gallery: '["https://example.com/img.jpg"]',
    });
    expect(result.valid).toBe(true);
  });

  it("returns multiple errors for multiple invalid fields", () => {
    const result = validatePackage({
      title: "",
      slug: "",
      price: "",
      durationDays: 0,
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(4);
  });
});
