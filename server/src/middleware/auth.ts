import type { NextFunction, Request, Response } from "express";
import type { Role, User } from "@prisma/client";
import { SESSION_COOKIE, findValidSession } from "../services/session.js";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    sessionToken?: string;
  }
}

// the only user shape we send to the client (no passwordHash)
export function publicUser(user: User): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = typeof token === "string" && token ? await findValidSession(token) : null;

  if (!session || !session.user.isActive) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  req.user = publicUser(session.user);
  req.sessionToken = token;
  next();
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: "You do not have permission to do this" });
      return;
    }
    next();
  };
}
