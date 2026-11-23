import type { Prisma } from "@prisma/client";

// a business rule refused the request inside a transaction: the transaction is rolled back
export class RuleError extends Error {
  constructor(
    public status: number,
    public body: { error: string; code?: string }
  ) {
    super(body.error);
  }
}

type Tx = Prisma.TransactionClient;

// F-07: requests of the same student wait for each other here, so the limit and the
// overlap check (BR-13, BR-14) cannot be passed by two parallel requests
export async function lockStudent(tx: Tx, studentId: number) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${studentId} FOR UPDATE`;
}

// F-06: booking and removing a slot wait for each other on the slot row
export async function lockSlot(tx: Tx, slotId: number) {
  await tx.$queryRaw`SELECT id FROM "Slot" WHERE id = ${slotId} FOR UPDATE`;
}

// ACTIVE bookings of the student whose slot has not ended, as time ranges
export async function activeRanges(tx: Tx, studentId: number, exceptBookingId?: number) {
  const rows = await tx.booking.findMany({
    where: { studentId, status: "ACTIVE", slot: { endsAt: { gt: new Date() } }, ...(exceptBookingId ? { id: { not: exceptBookingId } } : {}) },
    select: { slot: { select: { startsAt: true, endsAt: true } } },
  });
  return rows.map((r) => r.slot);
}
