import crypto from "node:crypto";
import { config } from "./config.js";
import {
  consumeOAuthState,
  createOAuthState,
  deleteSetting,
  getSetting,
  putSetting,
} from "./db.js";
import { decryptSecret, encryptSecret, hashToken } from "./tokens.js";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const CONNECTION_KEY = "google_drive_connection";
const ROOT_FOLDER_KEY = "google_drive_root_folder";

function redirectUri() {
  return `${config.baseUrl}/oauth/google/callback`;
}

function googleConfigured() {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

async function readConnection() {
  const value = await getSetting(CONNECTION_KEY);
  if (!value?.refresh_token_ciphertext) return null;
  return {
    ...value,
    refreshToken: decryptSecret(value.refresh_token_ciphertext),
  };
}

export async function driveConnected() {
  if (!googleConfigured()) return false;
  return Boolean(await readConnection());
}

export async function driveConnectionSummary() {
  const connection = await getSetting(CONNECTION_KEY);
  return connection
    ? { connected: true, email: connection.email || null, connectedAt: connection.connected_at || null }
    : { connected: false, email: null, connectedAt: null };
}

export function adminTokenMatches(candidate) {
  const expected = String(config.adminSetupToken || "");
  const supplied = String(candidate || "");
  if (!expected || !supplied) return false;
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  const suppliedHash = crypto.createHash("sha256").update(supplied).digest();
  return crypto.timingSafeEqual(expectedHash, suppliedHash);
}

export async function createGoogleAuthorizationUrl() {
  if (!googleConfigured()) throw new Error("Google OAuth is not configured");
  const state = crypto.randomBytes(32).toString("base64url");
  await createOAuthState(hashToken(state));
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: DRIVE_SCOPE,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(parameters) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(parameters),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Google OAuth error: ${payload.error_description || payload.error || response.status}`);
  }
  return payload;
}

async function fetchDriveUser(accessToken) {
  const response = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return {};
  const payload = await response.json();
  return payload.user || {};
}

export async function completeGoogleAuthorization({ code, state }) {
  if (!code || !state || !(await consumeOAuthState(hashToken(state)))) {
    throw new Error("คำขอเชื่อม Google Drive ไม่ถูกต้องหรือหมดอายุ");
  }
  const tokens = await tokenRequest({
    code,
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
  if (!tokens.refresh_token) {
    throw new Error("Google ไม่ได้ส่ง refresh token กรุณาเชื่อมใหม่และอนุญาตสิทธิ์อีกครั้ง");
  }
  const user = await fetchDriveUser(tokens.access_token);
  await putSetting(CONNECTION_KEY, {
    refresh_token_ciphertext: encryptSecret(tokens.refresh_token),
    email: user.emailAddress || null,
    display_name: user.displayName || null,
    connected_at: new Date().toISOString(),
    scope: DRIVE_SCOPE,
  });
  await deleteSetting(ROOT_FOLDER_KEY);
  return { email: user.emailAddress || null, displayName: user.displayName || null };
}

async function accessToken() {
  const connection = await readConnection();
  if (!connection) throw new Error("ยังไม่ได้เชื่อม Google Drive ของผู้ดูแลระบบ");
  const tokens = await tokenRequest({
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    refresh_token: connection.refreshToken,
    grant_type: "refresh_token",
  });
  if (tokens.refresh_token) {
    await putSetting(CONNECTION_KEY, {
      ...connection,
      refresh_token_ciphertext: encryptSecret(tokens.refresh_token),
      refreshToken: undefined,
    });
  }
  return tokens.access_token;
}

function driveQueryValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function driveFetch(url, options = {}, token = null) {
  const bearer = token || await accessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${bearer}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Google Drive error: ${payload.error?.message || response.status}`);
  }
  return payload;
}

async function findFolder(name, parentId, token) {
  const clauses = [
    `name = '${driveQueryValue(name)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `'${driveQueryValue(parentId)}' in parents`,
  ];
  const params = new URLSearchParams({
    q: clauses.join(" and "),
    fields: "files(id,name)",
    pageSize: "10",
    spaces: "drive",
  });
  const payload = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`, {}, token);
  return payload.files?.[0] || null;
}

async function createFolder(name, parentId, token) {
  return driveFetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  }, token);
}

async function ensureFolder(name, parentId, token) {
  return await findFolder(name, parentId, token) || await createFolder(name, parentId, token);
}

async function ensureReportFolder(date, token) {
  let root = await getSetting(ROOT_FOLDER_KEY);
  if (!root?.id) {
    root = await ensureFolder(config.google.driveFolderName, "root", token);
    await putSetting(ROOT_FOLDER_KEY, root);
  }
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yearFolder = await ensureFolder(year, root.id, token);
  const monthFolder = await ensureFolder(month, yearFolder.id, token);
  return { folder: monthFolder, path: `${config.google.driveFolderName}/${year}/${month}` };
}

async function uploadFile({ name, mimeType, buffer, parentId, token }) {
  const boundary = `sar_${crypto.randomBytes(18).toString("hex")}`;
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parentId] })}`
      + `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  return driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: Buffer.concat([prefix, buffer, suffix]),
    },
    token,
  );
}

export async function uploadReportFile({ name, mimeType, buffer, createdAt = new Date() }) {
  const token = await accessToken();
  const { folder, path } = await ensureReportFolder(new Date(createdAt), token);
  const file = await uploadFile({ name, mimeType, buffer, parentId: folder.id, token });
  return { ...file, folderPath: path };
}
