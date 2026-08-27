import test from "node:test";
import assert from "node:assert/strict";
import { emailJobDetails } from "../src/mailer.js";

test("email job details use a short reference and Thailand time", () => {
  const details = emailJobDetails({
    jobId: "12345678-1234-4123-8123-123456789abc",
    createdAt: "2026-08-27T08:41:13.727Z",
  });
  assert.equal(details.reference, "12345678");
  assert.match(details.submittedAt, /15:41/);
});
