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
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true },
      create: { ...u, passwordHash: hash },
    });
  }
  console.log(`Seed done: ${USERS.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => getPrisma().$disconnect());
