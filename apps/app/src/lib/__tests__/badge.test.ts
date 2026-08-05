import { describe, it, expect } from "vitest";
import { getStatusBadgeClass } from "../utils/badge";

describe("getStatusBadgeClass", () => {
  it("returns success classes for published status", () => {
    const result = getStatusBadgeClass("published");
    expect(result).toContain("bg-success/10");
    expect(result).toContain("text-success");
  });

  it("returns accent classes for draft status", () => {
    const result = getStatusBadgeClass("draft");
    expect(result).toContain("bg-accent/20");
    expect(result).toContain("text-accent-foreground");
  });

  it("returns muted classes for archived status", () => {
    const result = getStatusBadgeClass("archived");
    expect(result).toContain("bg-muted");
    expect(result).toContain("text-muted-foreground");
  });

  it("returns muted classes for unknown status", () => {
    const result = getStatusBadgeClass("unknown-status");
    expect(result).toContain("bg-muted");
    expect(result).toContain("text-muted-foreground");
  });

  it("returns muted classes for empty string", () => {
    const result = getStatusBadgeClass("");
    expect(result).toContain("bg-muted");
    expect(result).toContain("text-muted-foreground");
  });

  it("is case sensitive and treats PUBLISHED as unknown", () => {
    const result = getStatusBadgeClass("PUBLISHED");
    expect(result).toContain("bg-muted");
  });
});
