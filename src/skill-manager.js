import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { getSetting, putSetting } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(here, "../skills/ha-sar-lobe");
let pendingSkill;

async function listFiles(root, current = root) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const output = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === ".git") continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(root, absolute)));
    if (entry.isFile()) output.push({ absolute, relative: path.relative(root, absolute) });
  }
  return output;
}

async function skillDigest(files) {
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.relative);
    hash.update(await fs.readFile(file.absolute));
  }
  return hash.digest("hex");
}

function mimeType(filename) {
  if (filename.endsWith(".md")) return "text/markdown";
  if (filename.endsWith(".yaml") || filename.endsWith(".yml")) return "application/yaml";
  return "text/plain";
}

async function uploadBundle(endpoint, files) {
  const form = new FormData();
  for (const file of files) {
    const bytes = await fs.readFile(file.absolute);
    form.append(
      "files[]",
      new Blob([bytes], { type: mimeType(file.relative) }),
      `ha-sar-lobe/${file.relative.replaceAll(path.sep, "/")}`,
    );
  }
  const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openaiApiKey}` },
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OpenAI skill upload failed (${response.status}): ${payload.error?.message || "unknown error"}`);
  }
  return payload;
}

async function resolveSkill() {
  if (config.openaiSkillId) {
    return { skillId: config.openaiSkillId, version: config.openaiSkillVersion };
  }

  const files = await listFiles(skillRoot);
  if (!files.some((file) => file.relative.toLowerCase() === "skill.md")) {
    throw new Error("Bundled ha-sar-lobe is missing SKILL.md");
  }
  const hash = await skillDigest(files);
  const saved = await getSetting("ha_sar_lobe_skill");
  if (saved?.hash === hash && saved.skillId) {
    return { skillId: saved.skillId, version: saved.version || "latest" };
  }

  const endpoint = saved?.skillId ? `skills/${saved.skillId}/versions` : "skills";
  const uploaded = await uploadBundle(endpoint, files);
  const skillId = uploaded.skill_id || saved?.skillId || uploaded.id;
  const version = String(uploaded.version || uploaded.latest_version || uploaded.default_version || "latest");
  if (!skillId) throw new Error("OpenAI skill upload response did not include a skill id");

  await putSetting("ha_sar_lobe_skill", { hash, skillId, version });
  return { skillId, version };
}

export function ensureSkill() {
  pendingSkill ??= resolveSkill().catch((error) => {
    pendingSkill = null;
    throw error;
  });
  return pendingSkill;
}

export const skillRootPath = skillRoot;
