import { randomBytes } from "node:crypto";
import { getPrisma } from "../prisma.js";

export const SESSION_COOKIE = "slotbook.sid";
// BR-03: 8 hours
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function createSession(userId: number) {
  return getPrisma().session.create({
    data: { id: randomBytes(32).toString("hex"), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
}

export async function findValidSession(token: string) {
  const prisma = getPrisma();
  const session = await prisma.session.findUnique({ where: { id: token }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: token } }).catch(() => undefined);
    return null;
  }
  return session;
}

export async function deleteSession(token: string) {
  await getPrisma().session.delete({ where: { id: token } }).catch(() => undefined);
}
