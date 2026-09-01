import { describe, it, expect } from "vitest";
import { POST } from "../app/api/notifications/dispatch/route";
import { NextRequest } from "next/server";

describe("POST /api/notifications/dispatch Security Gate", () => {
  it("rejects unauthenticated requests with HTTP 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/notifications/dispatch", {
      method: "POST",
      body: JSON.stringify({
        summaryData: {
          title: "Test Reflection",
          mood: "Reflective",
          summary: "Summary test.",
          keyTakeaways: ["Point 1"],
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects requests missing Bearer token prefix with HTTP 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/notifications/dispatch", {
      method: "POST",
      headers: {
        authorization: "InvalidTokenWithoutBearer",
      },
      body: JSON.stringify({
        summaryData: {
          title: "Test Reflection",
          mood: "Reflective",
          summary: "Summary test.",
          keyTakeaways: ["Point 1"],
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects invalid summary payloads with HTTP 400 when authenticated", async () => {
    const req = new NextRequest("http://localhost:3000/api/notifications/dispatch", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-test-token",
      },
      body: JSON.stringify({
        summaryData: {
          title: "",
          mood: "Reflective",
          summary: "",
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
