import test from "node:test";
import assert from "node:assert/strict";
import { HA6_STANDARDS, getStandard } from "../src/standards.js";

test("registry covers every major Part I-III chapter", () => {
  assert.equal(HA6_STANDARDS.length, 22);
  assert.deepEqual(HA6_STANDARDS.map((item) => item.code), [
    "I-1", "I-2", "I-3", "I-4", "I-5", "I-6",
    "II-1", "II-2", "II-3", "II-4", "II-5", "II-6", "II-7", "II-8", "II-9", "II-10",
    "III-1", "III-2", "III-3", "III-4", "III-5", "III-6",
  ]);
});

test("II-3 maps to the three confirmed subchapters", () => {
  assert.deepEqual(getStandard("II-3").subchapters.map(([code]) => code), ["II-3.1", "II-3.2", "II-3.3"]);
});

test("subchapter codes are unique", () => {
  const codes = HA6_STANDARDS.flatMap((item) => item.subchapters.map(([code]) => code));
  assert.equal(codes.length, 54);
  assert.equal(new Set(codes).size, codes.length);
});

test("III-4 expands the eleven specific-care scoring units", () => {
  const codes = getStandard("III-4").subchapters.map(([code]) => code);
  assert.equal(codes.length, 13);
  assert.equal(codes[2], "III-4.3 ก");
  assert.equal(codes.at(-1), "III-4.3 ฎ");
});
