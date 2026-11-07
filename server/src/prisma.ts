import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    client = new PrismaClient({ adapter });
  }
  return client;
}
