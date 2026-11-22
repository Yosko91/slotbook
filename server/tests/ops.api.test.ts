import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("R-02 operation endpoints", () => {
  const saved = process.env.COMMIT_SHA;
  beforeAll(() => {
    process.env.COMMIT_SHA = "abc123";
  });
  afterAll(() => {
    if (saved === undefined) delete process.env.COMMIT_SHA;
    else process.env.COMMIT_SHA = saved;
  });

  it("TEST-63 /api/ready checks the database and /api/version gives the commit (AC-46, AC-48)", async () => {
    const app = createApp();
    const ready = await request(app).get("/api/ready");
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: "ready", db: "connected" });

    const version = await request(app).get("/api/version");
    expect(version.status).toBe(200);
    expect(version.body).toEqual({ commit: "abc123" });
  });
});
