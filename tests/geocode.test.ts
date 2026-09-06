import { describe, it, expect } from "vitest";
import { POST } from "../app/api/location/geocode/route";
import { NextRequest } from "next/server";
import { formatDisplayLocation } from "../lib/utils";

describe("formatDisplayLocation Helper", () => {
  it("extracts only the first iteration of the area from full location strings", () => {
    expect(formatDisplayLocation("Tangerang, Banten, Indonesia")).toBe("Tangerang");
    expect(formatDisplayLocation("San Francisco, CA 94103, USA")).toBe("San Francisco");
    expect(formatDisplayLocation("Brooklyn, New York, United States")).toBe("Brooklyn");
    expect(formatDisplayLocation("Tokyo, Japan")).toBe("Tokyo");
  });

  it("handles single-word or non-comma separated locations gracefully", () => {
    expect(formatDisplayLocation("Paris")).toBe("Paris");
    expect(formatDisplayLocation("   London   ")).toBe("London");
  });

  it("handles null, undefined, or empty location values safely", () => {
    expect(formatDisplayLocation(null)).toBe("");
    expect(formatDisplayLocation(undefined)).toBe("");
    expect(formatDisplayLocation("")).toBe("");
  });
});

describe("POST /api/location/geocode Security Gate", () => {
  it("rejects requests missing Bearer Authorization header with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/location/geocode", {
      method: "POST",
      body: JSON.stringify({ latitude: -6.1754, longitude: 106.8272 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects non-Bearer authorization header format with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/location/geocode", {
      method: "POST",
      headers: {
        authorization: "Basic dXNlcjpwYXNz",
      },
      body: JSON.stringify({ latitude: -6.1754, longitude: 106.8272 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects requests with invalid coordinate types with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/location/geocode", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-test-token",
      },
      body: JSON.stringify({ latitude: "invalid_lat", longitude: 106.8272 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
