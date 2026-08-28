import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewPrompt } from "../src/prompt.js";
import { getStandard } from "../src/standards.js";

test("review prompt pins exact HA6 titles and standard-based Thai terminology", () => {
  const prompt = buildReviewPrompt({
    standard: getStandard("II-3"),
    notes: "",
    hasPriorReport: false,
    filenames: ["sar.pdf"],
  });

  assert.match(prompt, /II-3\.3 สิ่งแวดล้อมเพื่อการสร้างเสริมสุขภาพและการพิทักษ์สิ่งแวดล้อม/);
  assert.doesNotMatch(prompt, /II-3\.3 สิ่งแวดล้อมเพื่อสุขภาพและความยั่งยืน/);
  assert.match(prompt, /ความเสี่ยงสำคัญหรือประเด็นสำคัญหลายเรื่อง/);
  assert.match(prompt, /ต้องตรงกับรายการข้างต้นทุกตัวอักษร/);
});
