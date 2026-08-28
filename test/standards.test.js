import test from "node:test";
import assert from "node:assert/strict";
import {
  HA6_STANDARDS,
  displayStandardHeading,
  getStandard,
} from "../src/standards.js";

test("registry covers every major Part I-III chapter", () => {
  assert.equal(HA6_STANDARDS.length, 22);
  assert.deepEqual(HA6_STANDARDS.map((item) => item.code), [
    "I-1", "I-2", "I-3", "I-4", "I-5", "I-6",
    "II-1", "II-2", "II-3", "II-4", "II-5", "II-6", "II-7", "II-8", "II-9", "II-10",
    "III-1", "III-2", "III-3", "III-4", "III-5", "III-6",
  ]);
});

test("II-3 maps to the three confirmed subchapters", () => {
  assert.deepEqual(getStandard("II-3").subchapters, [
    ["II-3.1", "สิ่งแวดล้อมทางกายภาพและความปลอดภัย"],
    ["II-3.2", "เครื่องมือและระบบสาธารณูปโภค"],
    ["II-3.3", "สิ่งแวดล้อมเพื่อการสร้างเสริมสุขภาพและการพิทักษ์สิ่งแวดล้อม"],
  ]);
  assert.equal(
    displayStandardHeading("II-3.3", getStandard("II-3").subchapters[2][1]),
    "II – 3.3 สิ่งแวดล้อมเพื่อการสร้างเสริมสุขภาพและการพิทักษ์สิ่งแวดล้อม",
  );
});

test("known paraphrased labels are replaced by the verbatim HA6 titles", () => {
  const titles = new Map(HA6_STANDARDS.flatMap((standard) => standard.subchapters));
  assert.equal(titles.get("I-1.2"), "การกำกับดูแลองค์กร การจัดบริการสุขภาพเพื่อความยั่งยืน และการทำประโยชน์ให้สังคม");
  assert.equal(titles.get("I-4.1"), "การวัด การวิเคราะห์ และใช้ข้อมูลเพื่อปรับปรุงผลการดำเนินการขององค์กร");
  assert.equal(titles.get("II-5.1"), "ระบบเวชระเบียน");
  assert.equal(titles.get("II-5.2"), "เวชระเบียนผู้ป่วย");
  assert.equal(titles.get("II-6.1"), "การกำกับดูแลและสิ่งแวดล้อมสนับสนุน");
  assert.equal(titles.get("II-7.4"), "พยาธิวิทยากายวิภาค, เซลล์วิทยา, นิติเวชศาสตร์และนิติเวชคลินิก");
  assert.equal(titles.get("III-3.1"), "การวางแผนการดูแล");
  assert.equal(titles.get("III-5"), "การให้ข้อมูลและการเสริมพลังแก่ผู้ป่วย/ครอบครัว");
  assert.ok(![...titles.values()].includes("สิ่งแวดล้อมเพื่อสุขภาพและความยั่งยืน"));
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
