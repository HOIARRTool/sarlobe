import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REVIEW_SCHEMA } from "../src/schema.js";

test("structured-output schema is strict at the root", () => {
  assert.equal(REVIEW_SCHEMA.additionalProperties, false);
  assert.ok(REVIEW_SCHEMA.required.includes("subchapters"));
});

test("bundled skill has one SKILL.md and no hospital files", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../skills/ha-sar-lobe");
  const all = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else all.push(path.relative(root, absolute));
    }
  }
  walk(root);
  assert.equal(all.filter((file) => path.basename(file).toLowerCase() === "skill.md").length, 1);
  assert.equal(all.some((file) => /\.(pdf|docx|xlsx|jpg|png)$/i.test(file)), false);
});
