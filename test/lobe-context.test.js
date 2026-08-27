import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildFocusedLobeContext, focusedLobeCodes } from "../src/lobe-context.js";
import { HA6_STANDARDS, getStandard } from "../src/standards.js";

test("II-3 loads only its HA6 and SPA knowledge", () => {
  const context = buildFocusedLobeContext(getStandard("II-3"));
  assert.deepEqual(focusedLobeCodes(getStandard("II-3")), ["II-3.1", "II-3.2", "II-3.3"]);
  assert.match(context, /II-3\.1/);
  assert.match(context, /II-3\.2/);
  assert.match(context, /II-3\.3/);
  assert.doesNotMatch(context, /II-4\.1/);
  assert.doesNotMatch(context, /I-1\.1/);
});

test("every selectable standard has focused normative context", () => {
  for (const standard of HA6_STANDARDS) {
    const context = buildFocusedLobeContext(standard);
    assert.match(context, new RegExp(standard.code.replace("-", "\\-")));
    assert.ok(context.length < 6500, `${standard.code} context should remain compact`);
  }
});

test("III-4 collapses lettered care units to one focused HA6 index entry", () => {
  const codes = focusedLobeCodes(getStandard("III-4"));
  assert.ok(codes.includes("III-4.3"));
  assert.equal(codes.filter((code) => code === "III-4.3").length, 1);
  assert.match(buildFocusedLobeContext(getStandard("III-4")), /critical care/);
});

test("OpenAI review uses focused prompt context without a shell skill bundle", async () => {
  const source = await readFile(new URL("../src/openai-service.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /skill_reference|container_auto|ensureSkill/);
  assert.doesNotMatch(source, /tools\s*:/);
});
