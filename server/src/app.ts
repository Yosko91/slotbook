import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

export function createApp() {
  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
