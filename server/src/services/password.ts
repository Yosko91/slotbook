import bcrypt from "bcryptjs";

// BR-02, NFR-03
const COST = 10;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
