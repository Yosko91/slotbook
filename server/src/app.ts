import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import { staffRouter } from "./routes/staff.js";
import { schedulesRouter } from "./routes/schedules.js";
import { bookingsRouter } from "./routes/bookings.js";
import { getPrisma } from "./prisma.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

export function createApp() {
  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // R-02: the commit the running image was built from, to match the deployment with the tag and the CI run
  app.get("/api/version", (_req, res) => {
    res.json({ commit: process.env.COMMIT_SHA || "local" });
  });

  // R-02: the app can reach the database (used by the CI and the smoke test)
  app.get("/api/ready", async (_req, res) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      res.json({ status: "ready", db: "connected" });
    } catch (err) {
      console.error("[GET /api/ready]", err);
      res.status(503).json({ status: "not ready", db: "disconnected" });
    }
  });
  app.use("/api/auth", authRouter);

  // everything else under /api needs a session (deny by default)
  app.use("/api", requireAuth);
  app.use("/api/staff", staffRouter);
  app.use("/api/schedules", schedulesRouter);
  app.use("/api/bookings", bookingsRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // R-02: in the Docker image the API also serves the built React app (one URL, first party cookie).
  // Not set in local development, where Vite serves the client.
  const clientDir = process.env.CLIENT_DIST_DIR;
  if (clientDir && fs.existsSync(path.join(clientDir, "index.html"))) {
    app.use(express.static(clientDir));
    // React Router pages (/login, /bookings/12 ...) all load index.html
    app.get(/^\/(?!api(\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

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
