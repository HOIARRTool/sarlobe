import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { config, assertProductionConfig } from "./config.js";
import {
  createJob,
  deleteExpiredJobs,
  getJobById,
  initDb,
  pool,
} from "./db.js";
import { emailConfigured } from "./mailer.js";
import {
  adminTokenMatches,
  completeGoogleAuthorization,
  createGoogleAuthorizationUrl,
  driveConnected,
  driveConnectionSummary,
} from "./google-drive.js";
import {
  processResponseId,
  startFallbackPoller,
  startReview,
  unwrapWebhook,
} from "./openai-service.js";
import { googleAdminPage, homePage, notFoundPage, submittedPage } from "./report.js";
import { getStandard } from "./standards.js";
import { encryptToken, hashToken, newAccessToken } from "./tokens.js";

assertProductionConfig();
await initDb();

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        formAction: ["'self'", "https://accounts.google.com"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
  }),
);

// Webhook signature verification requires the untouched request body.
app.post("/webhooks/openai", express.text({ type: "application/json", limit: "2mb" }), async (req, res) => {
  try {
    const event = await unwrapWebhook(req.body, req.headers);
    res.status(200).send("ok");
    if (["response.completed", "response.failed", "response.incomplete", "response.cancelled"].includes(event.type)) {
      const responseId = event.data?.id;
      if (responseId) void processResponseId(responseId);
    }
  } catch (error) {
    res.status(400).send("invalid webhook");
  }
});

app.use(express.static(new URL("../public", import.meta.url).pathname, { maxAge: "1h" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "ลองเชื่อมบัญชีถี่เกินไป กรุณารอสักครู่",
});

const allowedExtensions = new Set([".pdf", ".docx", ".txt", ".csv", ".xlsx"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileMb * 1024 * 1024, files: 2, fields: 8 },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    callback(extension && allowedExtensions.has(extension) ? null : new Error(`ไม่รองรับไฟล์ ${file.originalname}`), true);
  },
});

async function deliveryReady() {
  return emailConfigured() && await driveConnected();
}

async function renderHomeError(res, message, status = 400) {
  res.status(status).send(homePage({ maxFileMb: config.maxFileMb, deliveryReady: await deliveryReady(), error: message }));
}

app.get("/", async (_req, res) => {
  res.send(homePage({ maxFileMb: config.maxFileMb, deliveryReady: await deliveryReady() }));
});

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.get("/admin/google", async (_req, res) => {
  res.set("Cache-Control", "private, no-store");
  res.send(googleAdminPage({ connection: await driveConnectionSummary() }));
});

app.post("/admin/google/connect", adminLimiter, async (req, res) => {
  if (!adminTokenMatches(req.body.admin_token)) {
    return res.status(403).send(googleAdminPage({
      connection: await driveConnectionSummary(),
      error: "ADMIN_SETUP_TOKEN ไม่ถูกต้อง",
    }));
  }
  return res.redirect(303, await createGoogleAuthorizationUrl());
});

app.get("/oauth/google/callback", async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  try {
    if (req.query.error) throw new Error(`Google OAuth: ${req.query.error}`);
    const result = await completeGoogleAuthorization({ code: req.query.code, state: req.query.state });
    return res.send(googleAdminPage({
      connection: await driveConnectionSummary(),
      message: `เชื่อม Google Drive สำเร็จ${result.email ? ` (${result.email})` : ""}`,
    }));
  } catch (error) {
    return res.status(400).send(googleAdminPage({
      connection: await driveConnectionSummary(),
      error: error.message || "เชื่อม Google Drive ไม่สำเร็จ",
    }));
  }
});

app.post(
  "/review",
  submitLimiter,
  upload.fields([
    { name: "sar_file", maxCount: 1 },
    { name: "prior_report", maxCount: 1 },
  ]),
  async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const emailConfirm = String(req.body.email_confirm || "").trim().toLowerCase();
    const standard = getStandard(String(req.body.standard_code || ""));
    const sarFile = req.files?.sar_file?.[0];
    const priorFile = req.files?.prior_report?.[0];
    const notes = String(req.body.notes || "").slice(0, 8000);

    if (!standard) return renderHomeError(res, "กรุณาเลือกมาตรฐาน HA6");
    if (!email || email !== emailConfirm || !/^\S+@\S+\.\S+$/.test(email)) {
      return renderHomeError(res, "อีเมลทั้งสองช่องต้องถูกต้องและตรงกัน");
    }
    if (!sarFile) return renderHomeError(res, "กรุณาแนบไฟล์ SAR");
    if (req.body.privacy_confirm !== "yes") {
      return renderHomeError(res, "กรุณายืนยันการลบข้อมูลส่วนบุคคลที่ไม่จำเป็นก่อนส่ง");
    }
    if (priorFile && ![".pdf", ".docx", ".txt"].some((ext) => priorFile.originalname.toLowerCase().endsWith(ext))) {
      return renderHomeError(res, "รายงานครั้งก่อนรองรับเฉพาะ PDF, DOCX หรือ TXT");
    }
    if (!(await deliveryReady())) {
      return renderHomeError(res, "ระบบยังไม่พร้อมส่ง Word/PDF ทางอีเมลและบันทึก Google Drive กรุณาติดต่อผู้ดูแล", 503);
    }

    const token = newAccessToken();
    const job = {
      id: crypto.randomUUID(),
      email,
      standardCode: standard.code,
      standardTitle: standard.title,
      accessTokenHash: hashToken(token),
      accessTokenCiphertext: encryptToken(token),
    };
    await createJob(job);
    void startReview({ job, standard, notes, sarFile, priorFile });
    res.redirect(303, `/submitted/${job.id}`);
  },
);

app.get("/submitted/:id", async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
    return res.status(404).send(notFoundPage());
  }
  const job = await getJobById(req.params.id);
  if (!job) return res.status(404).send(notFoundPage());
  res.set("Cache-Control", "private, no-store");
  return res.send(submittedPage(job));
});

app.use(async (error, _req, res, _next) => {
  const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
    ? `ไฟล์มีขนาดเกิน ${config.maxFileMb} MB`
    : error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่";
  await renderHomeError(res, message, 400);
});

app.use((_req, res) => res.status(404).send(notFoundPage()));

startFallbackPoller();
const cleanupTimer = setInterval(() => deleteExpiredJobs().catch(() => {}), 6 * 60 * 60 * 1000);
cleanupTimer.unref();

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`HA SAR Reviewer listening on port ${config.port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
