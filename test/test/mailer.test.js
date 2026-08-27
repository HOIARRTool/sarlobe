import test from "node:test";
import assert from "node:assert/strict";
import { emailJobDetails, failureEmailContent } from "../src/mailer.js";

test("email job details use a short reference and Thailand time", () => {
  const details = emailJobDetails({
    jobId: "12345678-1234-4123-8123-123456789abc",
    createdAt: "2026-08-27T08:41:13.727Z",
  });
  assert.equal(details.reference, "12345678");
  assert.match(details.submittedAt, /15:41/);
});

test("rate-limit failures receive a clear retry email", () => {
  const content = failureEmailContent({
    standardCode: "II-3",
    standardTitle: "สิ่งแวดล้อมในการดูแลผู้ป่วย/ผู้รับผลงาน",
    jobId: "1395bb1b-1234-4123-8123-123456789abc",
    createdAt: "2026-08-27T09:20:38.117Z",
    errorMessage: "Rate limit reached for gpt-5.6 on tokens per min (TPM)",
  });

  assert.match(content.subject, /ระบบประมวลผลหนาแน่น SAR II-3/);
  assert.match(content.subject, /Ref 1395BB1B/);
  assert.match(content.text, /ระบบมีงานประมวลผลพร้อมกันเกินขีดจำกัด กรุณารอแล้วส่งใหม่/);
  assert.match(content.text, /รอประมาณ 2–3 นาที/);
  assert.match(content.text, /ส่งคำขอใหม่เพียงครั้งเดียว/);
  assert.doesNotMatch(content.text, /ติดต่อผู้ดูแลระบบ/);
});
