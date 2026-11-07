import { randomUUID } from "node:crypto";
import type { Role } from "@prisma/client";
import { getPrisma } from "../src/prisma.js";
import { hashPassword } from "../src/services/password.js";
import { SESSION_COOKIE, SESSION_TTL_MS } from "../src/services/session.js";

export const TEST_PASSWORD = "Test-pass1";

// each test makes its own users, so it never depends on the seed
export async function createUser(role: Role, name?: string) {
  const id = randomUUID().slice(0, 8);
  const user = await getPrisma().user.create({
    data: {
      name: name ?? `Test ${role.toLowerCase()} ${id}`,
      email: `${role.toLowerCase()}-${id}@slotbook.test`,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role,
    },
  });
  await getPrisma().session.create({
    data: { id: `test-${user.id}`, userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return user;
}

export function cookieFor(user: { id: number }) {
  return `${SESSION_COOKIE}=test-${user.id}`;
}

export async function deleteUsers(ids: number[]) {
  await getPrisma().user.deleteMany({ where: { id: { in: ids } } });
}

export async function createSchedule(staffIds: number[]) {
  return getPrisma().schedule.create({
    data: {
      name: `Test schedule ${randomUUID().slice(0, 8)}`,
      staff: { create: staffIds.map((staffId) => ({ staffId })) },
    },
  });
}

// cascade deletes the slots and the staff links
export async function deleteSchedules(ids: number[]) {
  await getPrisma().schedule.deleteMany({ where: { id: { in: ids } } });
}

// a Bangkok date and time some days from today, for example inDays(3, "10:00")
export function inDays(days: number, time: string) {
  const bkk = new Date(Date.now() + 7 * 3600 * 1000 + days * 24 * 3600 * 1000);
  const day = bkk.toISOString().slice(0, 10);
  return new Date(`${day}T${time}:00+07:00`);
}
