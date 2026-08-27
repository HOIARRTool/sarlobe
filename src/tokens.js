import crypto from "node:crypto";
import { config } from "./config.js";

const key = crypto.createHash("sha256").update(config.appSecret).digest();

export function newAccessToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function encryptToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export const encryptSecret = encryptToken;

export function decryptToken(payload) {
  const [ivText, tagText, encryptedText] = String(payload).split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("Invalid token ciphertext");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export const decryptSecret = decryptToken;
