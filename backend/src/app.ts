import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import adminRouter from "./routes/admin";
import authRouter from "./routes/auth";
import detectRouter from "./routes/detect";
import paymentsRouter from "./routes/payments";
import usersRouter from "./routes/users";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1", detectRouter);
app.use("/api/v1/admin", adminRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    release: "commercial-forensics-v3",
    time: new Date().toISOString(),
    readiness: {
      sightengine: Boolean(
        process.env.SIGHTENGINE_API_USER &&
          process.env.SIGHTENGINE_API_SECRET,
      ),
      redis: Boolean(process.env.REDIS_URL),
      hive: Boolean(process.env.HIVE_API_KEY),
      trustedProxy: Boolean(process.env.APP_CLIENT_SECRET),
    },
  });
});

const adminDistPath = path.join(__dirname, "../../admin-panel/dist");
const adminIndexPath = path.join(adminDistPath, "index.html");
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");

if (fs.existsSync(adminIndexPath)) {
  app.use("/admin", express.static(adminDistPath));
  app.get("/admin/*", (_req, res) => {
    res.sendFile(adminIndexPath);
  });
} else {
  console.info("Admin static assets are not bundled; skipping admin hosting.");
}

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
} else {
  console.info("Frontend static assets are not bundled; running API-only mode.");
  app.get("/", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "ai-spy-backend",
      health: "/health",
    });
  });
  app.use((_req, res) => {
    res.status(404).json({ code: 404, msg: "Route not found" });
  });
}

app.listen(port, () => {
  console.log(`Backend secure proxy is running on port ${port}`);
});
