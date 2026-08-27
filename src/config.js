import "dotenv/config";

function numberEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: numberEnv("PORT", 3000),
  baseUrl: (process.env.APP_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${numberEnv("PORT", 3000)}`).replace(/\/$/, ""),
  appSecret: process.env.APP_SECRET || "development-only-change-me",
  databaseUrl: process.env.DATABASE_URL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.6",
  openaiWebhookSecret: process.env.OPENAI_WEBHOOK_SECRET,
  openaiSkillId: process.env.OPENAI_SKILL_ID,
  openaiSkillVersion: process.env.OPENAI_SKILL_VERSION || "latest",
  maxFileMb: numberEnv("MAX_FILE_MB", 15),
  resultTtlDays: numberEnv("RESULT_TTL_DAYS", 7),
  pollIntervalSeconds: numberEnv("POLL_INTERVAL_SECONDS", 30),
  deliveryRetrySeconds: numberEnv("DELIVERY_RETRY_SECONDS", 300),
  adminSetupToken: process.env.ADMIN_SETUP_TOKEN,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    driveFolderName: process.env.GOOGLE_DRIVE_FOLDER_NAME || "HA-SAR-Results",
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: numberEnv("SMTP_PORT", 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || "HA SAR Reviewer <no-reply@example.org>",
  },
};

export function assertProductionConfig() {
  const missing = [];
  if (!config.databaseUrl) missing.push("DATABASE_URL");
  if (!config.openaiApiKey) missing.push("OPENAI_API_KEY");
  if (config.nodeEnv === "production" && config.appSecret === "development-only-change-me") {
    missing.push("APP_SECRET");
  }
  if (config.nodeEnv === "production") {
    if (!config.smtp.host) missing.push("SMTP_HOST");
    if (!config.smtp.user) missing.push("SMTP_USER");
    if (!config.smtp.pass) missing.push("SMTP_PASS");
    if (!process.env.MAIL_FROM) missing.push("MAIL_FROM");
    if (!config.google.clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!config.google.clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    if (!config.adminSetupToken) missing.push("ADMIN_SETUP_TOKEN");
  }
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
