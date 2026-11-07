import "dotenv/config";
import type { Role } from "@prisma/client";
import { getPrisma } from "../src/prisma.js";
import { hashPassword } from "../src/services/password.js";

// local development only, also written in the README. Never use it on a real server.
const DEV_PASSWORD = "SlotBook!2026";

const USERS: { name: string; email: string; role: Role }[] = [
  { name: "Somchai Wongsa", email: "somchai.tutor@slotbook.dev", role: "STAFF" },
  { name: "Anong Kittisak", email: "anong.tutor@slotbook.dev", role: "STAFF" },
  { name: "Lucas Bernard", email: "lucas.tutor@slotbook.dev", role: "STAFF" },
  { name: "Nattapong Srisuk", email: "nattapong@slotbook.dev", role: "STUDENT" },
  { name: "Ploy Chaiyaporn", email: "ploy@slotbook.dev", role: "STUDENT" },
  { name: "Kevin Martin", email: "kevin@slotbook.dev", role: "STUDENT" },
];

async function main() {
  const prisma = getPrisma();
  const hash = await hashPassword(DEV_PASSWORD);

  // upsert, so the seed can run many times
  const ids: Record<string, number> = {};
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true },
      create: { ...u, passwordHash: hash },
    });
    ids[u.email] = user.id;
  }

  const scheduleIds: Record<string, number> = {};
  for (const s of SCHEDULES) {
    const schedule = await prisma.schedule.upsert({
      where: { name: s.name },
      update: { description: s.description, isActive: true },
      create: { name: s.name, description: s.description },
    });
    scheduleIds[s.name] = schedule.id;
    for (const email of s.tutors) {
      const key = { scheduleId: schedule.id, staffId: ids[email]! };
      await prisma.scheduleStaff.upsert({ where: { scheduleId_staffId: key }, update: {}, create: key });
    }
  }

  // demo slots for the next 5 days, skipped when the tutor already has a slot at that time
  let created = 0;
  for (let day = 1; day <= 5; day++) {
    for (const s of SLOTS) {
      const startsAt = bangkok(day, s.time);
      const endsAt = new Date(startsAt.getTime() + s.length * 60000);
      const tutorId = ids[s.tutor]!;
      const clash = await prisma.slot.findFirst({ where: { tutorId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
      if (clash) continue;
      await prisma.slot.create({ data: { scheduleId: scheduleIds[s.schedule]!, tutorId, startsAt, endsAt } });
      created++;
    }
  }
  console.log(`Seed done: ${USERS.length} users, ${SCHEDULES.length} schedules, ${created} new slots`);
}

const SCHEDULES = [
  { name: "Calculus I", description: "Limits, derivatives, integrals", tutors: ["somchai.tutor@slotbook.dev", "anong.tutor@slotbook.dev"] },
  { name: "Programming Fundamentals", description: "C and Python basics, debugging", tutors: ["anong.tutor@slotbook.dev", "lucas.tutor@slotbook.dev"] },
  { name: "Physics I", description: "Mechanics and waves", tutors: ["lucas.tutor@slotbook.dev"] },
];

const SLOTS = [
  { schedule: "Calculus I", tutor: "somchai.tutor@slotbook.dev", time: "10:00", length: 60 },
  { schedule: "Calculus I", tutor: "somchai.tutor@slotbook.dev", time: "14:00", length: 30 },
  { schedule: "Calculus I", tutor: "anong.tutor@slotbook.dev", time: "09:00", length: 30 },
  { schedule: "Programming Fundamentals", tutor: "anong.tutor@slotbook.dev", time: "13:00", length: 60 },
  { schedule: "Programming Fundamentals", tutor: "lucas.tutor@slotbook.dev", time: "16:30", length: 30 },
  { schedule: "Physics I", tutor: "lucas.tutor@slotbook.dev", time: "10:30", length: 60 },
];

function bangkok(daysFromToday: number, time: string) {
  const day = new Date(Date.now() + 7 * 3600 * 1000 + daysFromToday * 86400000).toISOString().slice(0, 10);
  return new Date(`${day}T${time}:00+07:00`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => getPrisma().$disconnect());
