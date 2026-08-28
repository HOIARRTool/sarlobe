import test from "node:test";
import assert from "node:assert/strict";
import { ReviewInputError, validateReview } from "../src/review-validator.js";
import { getStandard } from "../src/standards.js";

const standard = getStandard("II-3");

function validation(status, detected = []) {
  return {
    input_validation: {
      status,
      selected_standard_code: "II-3",
      primary_file_name: "sar.pdf",
      detected_standard_codes: detected,
      explanation: "ผลการตรวจไฟล์",
      source_reference: "sar.pdf หน้า 1",
    },
    standard_code: "II-3",
    subchapters: [],
  };
}

test("a clearly mismatched SAR is stopped before scoring", () => {
  assert.throws(
    () => validateReview(validation("mismatch", ["II-1"]), standard),
    (error) => {
      assert.ok(error instanceof ReviewInputError);
      assert.equal(error.code, "INPUT_MISMATCH");
      assert.match(error.userMessage, /II-1/);
      return true;
    },
  );
});

test("an unreadable or content-insufficient SAR is stopped before scoring", () => {
  assert.throws(
    () => validateReview(validation("insufficient"), standard),
    (error) => {
      assert.ok(error instanceof ReviewInputError);
      assert.equal(error.code, "INPUT_INSUFFICIENT");
      return true;
    },
  );
});

test("validated reviews always use canonical HA6 titles instead of model wording", () => {
  const review = validation("matched");
  review.standard_title = "ชื่อที่ AI เรียบเรียงเอง";
  review.subchapters = standard.subchapters.map(([code]) => ({
    code,
    title: "ชื่อที่ AI เรียบเรียงเอง",
    development: { self_score: 3, ai_assisted_score: 3 },
  }));

  const validated = validateReview(review, standard);
  assert.equal(validated.standard_title, standard.title);
  assert.deepEqual(
    validated.subchapters.map(({ code, title }) => [code, title]),
    standard.subchapters,
  );
});
