import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { analyzePhotoRouter } from "./routes/analyzePhoto.js";
import { groupInviteRouter } from "./routes/groupInvite.js";
import { backupRouter } from "./routes/backup.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", analyzePhotoRouter);
app.use("/api", groupInviteRouter);
app.use("/api", backupRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Error && err.message.includes("File too large")) {
    return res.status(413).json({ error: "File too large" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
