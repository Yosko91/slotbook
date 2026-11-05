import { Router } from "express";
import { getPrisma } from "../prisma.js";
import { publicUser, requireAuth } from "../middleware/auth.js";
import { verifyPassword } from "../services/password.js";
import { SESSION_COOKIE, SESSION_TTL_MS, createSession, deleteSession } from "../services/session.js";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
};

// used when the email is unknown, so the bcrypt compare takes the same time (BR-02)
const FAKE_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.QcZ9n1dYgyXc8x0qmUWa8Q8Eo6zi";

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await getPrisma().user.findUnique({ where: { email: email.trim().toLowerCase() } });
  const ok = await verifyPassword(password, user?.passwordHash ?? FAKE_HASH);

  if (!user || !user.isActive || !ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const session = await createSession(user.id);
  res.cookie(SESSION_COOKIE, session.id, { ...cookieOptions, maxAge: SESSION_TTL_MS });
  res.json(publicUser(user));
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await deleteSession(req.sessionToken!);
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});
