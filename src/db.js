import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === "production" ? { rejectUnauthorized: false } : false,
  max: 5,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS review_jobs (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL,
      standard_code TEXT NOT NULL,
      standard_title TEXT NOT NULL,
      access_token_hash TEXT NOT NULL,
      access_token_ciphertext TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
      response_id TEXT,
      result JSONB,
      error_message TEXT,
      delivery JSONB,
      delivery_error TEXT,
      delivery_attempted_at TIMESTAMPTZ,
      notified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    ALTER TABLE review_jobs ADD COLUMN IF NOT EXISTS delivery JSONB;
    ALTER TABLE review_jobs ADD COLUMN IF NOT EXISTS delivery_error TEXT;
    ALTER TABLE review_jobs ADD COLUMN IF NOT EXISTS delivery_attempted_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS oauth_states (
      state_hash TEXT PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS review_jobs_response_id_idx ON review_jobs(response_id);
    CREATE INDEX IF NOT EXISTS review_jobs_status_idx ON review_jobs(status, updated_at);
    CREATE INDEX IF NOT EXISTS review_jobs_expiry_idx ON review_jobs(expires_at);
  `);
}

export async function getSetting(key) {
  const result = await pool.query("SELECT value FROM app_settings WHERE key = $1", [key]);
  return result.rows[0]?.value ?? null;
}

export async function putSetting(key, value) {
  await pool.query(
    `INSERT INTO app_settings(key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value],
  );
}

export async function deleteSetting(key) {
  await pool.query("DELETE FROM app_settings WHERE key = $1", [key]);
}

export async function createOAuthState(stateHash) {
  await pool.query("DELETE FROM oauth_states WHERE expires_at <= NOW()");
  await pool.query(
    "INSERT INTO oauth_states(state_hash, expires_at) VALUES ($1, NOW() + INTERVAL '10 minutes')",
    [stateHash],
  );
}

export async function consumeOAuthState(stateHash) {
  const result = await pool.query(
    "DELETE FROM oauth_states WHERE state_hash = $1 AND expires_at > NOW() RETURNING state_hash",
    [stateHash],
  );
  return result.rowCount === 1;
}

export async function createJob(job) {
  await pool.query(
    `INSERT INTO review_jobs
      (id, email, standard_code, standard_title, access_token_hash,
       access_token_ciphertext, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'queued', NOW() + ($7 * INTERVAL '1 day'))`,
    [
      job.id,
      job.email,
      job.standardCode,
      job.standardTitle,
      job.accessTokenHash,
      job.accessTokenCiphertext,
      config.resultTtlDays,
    ],
  );
}

export async function markProcessing(id, responseId = null) {
  await pool.query(
    `UPDATE review_jobs
     SET status = 'processing', response_id = COALESCE($2, response_id), updated_at = NOW()
     WHERE id = $1`,
    [id, responseId],
  );
}

export async function markCompleted(id, result) {
  await pool.query(
    `UPDATE review_jobs
     SET status = 'completed', result = $2, error_message = NULL, updated_at = NOW()
     WHERE id = $1`,
    [id, result],
  );
}

export async function markFailed(id, message) {
  await pool.query(
    `UPDATE review_jobs
     SET status = 'failed', error_message = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, String(message).slice(0, 2000)],
  );
}

export async function markNotified(id) {
  await pool.query(
    "UPDATE review_jobs SET notified_at = NOW(), delivery_error = NULL, updated_at = NOW() WHERE id = $1",
    [id],
  );
}

export async function saveDeliveryFile(id, format, file) {
  await pool.query(
    `UPDATE review_jobs
     SET delivery = COALESCE(delivery, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb),
         delivery_error = NULL, updated_at = NOW()
     WHERE id = $1`,
    [id, format, JSON.stringify(file)],
  );
}

export async function markDeliveryError(id, message) {
  await pool.query(
    `UPDATE review_jobs
     SET delivery_error = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, String(message).slice(0, 2000)],
  );
}

export async function claimDeliveryJob(id) {
  const result = await pool.query(
    `UPDATE review_jobs
     SET delivery_attempted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'completed' AND notified_at IS NULL
       AND (delivery_attempted_at IS NULL OR delivery_attempted_at < NOW() - ($2 * INTERVAL '1 second'))
     RETURNING *`,
    [id, config.deliveryRetrySeconds],
  );
  return result.rows[0] ?? null;
}

export async function getDeliverableJobs(limit = 5) {
  const result = await pool.query(
    `SELECT * FROM review_jobs
     WHERE status = 'completed' AND notified_at IS NULL
       AND (delivery_attempted_at IS NULL OR delivery_attempted_at < NOW() - ($2 * INTERVAL '1 second'))
     ORDER BY updated_at ASC LIMIT $1`,
    [limit, config.deliveryRetrySeconds],
  );
  return result.rows;
}

export async function getJobByAccess(id, tokenHash) {
  const result = await pool.query(
    `SELECT * FROM review_jobs
     WHERE id = $1 AND access_token_hash = $2 AND expires_at > NOW()`,
    [id, tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function getJobById(id) {
  const result = await pool.query("SELECT * FROM review_jobs WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function getJobByResponseId(responseId) {
  const result = await pool.query("SELECT * FROM review_jobs WHERE response_id = $1", [responseId]);
  return result.rows[0] ?? null;
}

export async function getPendingJobs(limit = 10) {
  const result = await pool.query(
    `SELECT * FROM review_jobs
     WHERE status = 'processing' AND response_id IS NOT NULL
     ORDER BY updated_at ASC LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function deleteExpiredJobs() {
  const result = await pool.query("DELETE FROM review_jobs WHERE expires_at <= NOW()");
  return result.rowCount;
}
