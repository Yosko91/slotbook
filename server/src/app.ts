import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

export function createApp() {
  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/auth", authRouter);

  // everything else under /api needs a session (deny by default)
  app.use("/api", requireAuth);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // never send a stack trace to the client
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  });

  return app;
}
