import request from "supertest";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { TEST_PASSWORD, cookieFor, createUser, deleteUsers } from "./helpers.js";

const app = createApp();
let student: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  student = await createUser("STUDENT");
});

afterAll(async () => {
  await deleteUsers([student.id]);
});

describe("F-01 login, logout, current user", () => {
  it("TEST-01 valid login returns the user and an httpOnly cookie", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: student.email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: student.id, name: student.name, email: student.email, role: "STUDENT" });
    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toMatch(/^slotbook\.sid=/);
    expect(cookie).toMatch(/HttpOnly/);
  });

  it("TEST-02 wrong password gives 401 and no cookie", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: student.email, password: "Wrong-pass1" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password" });
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("TEST-03 unknown email gives exactly the same answer", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@slotbook.test", password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password" });
  });

  it("missing fields give 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: student.email });
    expect(res.status).toBe(400);
  });

  it("TEST-04 /me returns the current user with a session and 401 without", async () => {
    const me = await request(app).get("/api/auth/me").set("Cookie", cookieFor(student));
    expect(me.status).toBe(200);
    expect(me.body.role).toBe("STUDENT");
    expect(me.body.passwordHash).toBeUndefined();

    const anonymous = await request(app).get("/api/auth/me");
    expect(anonymous.status).toBe(401);
  });

  it("TEST-05 logout deletes the session and the cookie stops working", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: student.email, password: TEST_PASSWORD });
    const cookie = login.headers["set-cookie"]![0]!.split(";")[0]!;
    const token = cookie.split("=")[1]!;

    const logout = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logout.status).toBe(204);
    expect(await getPrisma().session.findUnique({ where: { id: token } })).toBeNull();

    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(401);
  });

  it("TEST-06 protected endpoints without session give 401 and no data", async () => {
    const calls = [
      request(app).get("/api/bookings/mine"),
      request(app).get("/api/staff/schedules"),
      request(app).post("/api/bookings").send({ slotId: 1, topic: "Some topic" }),
    ];
    for (const res of await Promise.all(calls)) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required" });
    }
  });

  it("TEST-07 password is stored as a bcrypt hash", async () => {
    const row = await getPrisma().user.findUniqueOrThrow({ where: { id: student.id } });

    expect(row.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(row.passwordHash).not.toBe(TEST_PASSWORD);
    expect(await bcrypt.compare(TEST_PASSWORD, row.passwordHash)).toBe(true);
  });
});
