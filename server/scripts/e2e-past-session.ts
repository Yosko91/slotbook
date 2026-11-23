// E2E setup only (TEST-83): a past session cannot be created through the API (BR-07),
// so the test inserts one directly, like the API tests do. Prints { bookingId, startsAt }.
import "dotenv/config";
import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();
  const tutor = await prisma.user.findUniqueOrThrow({ where: { email: "somchai.tutor@slotbook.dev" } });
  const student = await prisma.user.findUniqueOrThrow({ where: { email: "kevin@slotbook.dev" } });
  const schedule = await prisma.schedule.findUniqueOrThrow({ where: { name: "Calculus I" } });
  // started 1 to 2 hours ago, a different minute each run
  const startsAt = new Date(Math.floor((Date.now() - 60 * 60000 - Math.random() * 60 * 60000) / 60000) * 60000);
  const slot = await prisma.slot.create({
    data: { scheduleId: schedule.id, tutorId: tutor.id, startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60000) },
  });
  const booking = await prisma.booking.create({
    data: { slotId: slot.id, studentId: student.id, topic: "E2E past session for attendance" },
  });
  console.log(JSON.stringify({ bookingId: booking.id, startsAt: startsAt.toISOString() }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => getPrisma().$disconnect());
