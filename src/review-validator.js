export class ReviewInputError extends Error {
  constructor(code, userMessage) {
    super(`${code}: ${userMessage}`);
    this.name = "ReviewInputError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

function validateInputMatch(review, standard) {
  const input = review.input_validation;
  if (!input || typeof input !== "object") throw new Error("AI output has no input validation");
  if (input.selected_standard_code !== standard.code) {
    throw new Error(`AI input-validation standard mismatch: expected ${standard.code}`);
  }
  if (input.status === "mismatch") {
    const detected = Array.isArray(input.detected_standard_codes)
      ? input.detected_standard_codes.filter(Boolean).join(", ")
      : "";
    const detectedText = detected ? ` โดยตรวจพบเนื้อหาที่สอดคล้องกับ ${detected}` : "";
    throw new ReviewInputError(
      "INPUT_MISMATCH",
      `เลือกมาตรฐาน ${standard.code} แต่ไฟล์ SAR หลักไม่พบเนื้อหาสาระของมาตรฐานนี้${detectedText} กรุณาตรวจสอบมาตรฐานที่เลือกและแนบไฟล์ใหม่`,
    );
  }
  if (input.status === "insufficient") {
    throw new ReviewInputError(
      "INPUT_INSUFFICIENT",
      `ไม่สามารถยืนยันได้ว่าไฟล์ SAR หลักมีเนื้อหาสาระเพียงพอสำหรับมาตรฐาน ${standard.code} กรุณาตรวจว่าไฟล์อ่านได้และมีบริบท กระบวนการ หรือผลลัพธ์ของมาตรฐานที่เลือก`,
    );
  }
  if (input.status !== "matched") throw new Error(`Invalid input-validation status: ${input.status}`);
}

export function validateReview(review, standard) {
  if (!review || typeof review !== "object") throw new Error("AI output is not an object");
  validateInputMatch(review, standard);
  if (review.standard_code !== standard.code) {
    throw new Error(`AI output standard mismatch: expected ${standard.code}`);
  }
  if (!Array.isArray(review.subchapters)) throw new Error("AI output has no subchapters array");
  const expected = standard.subchapters.map(([code]) => code);
  const actual = review.subchapters.map((item) => item.code);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`AI output subchapters mismatch: expected ${expected.join(", ")}`);
  }
  for (const item of review.subchapters) {
    const aiScore = item.development?.ai_assisted_score;
    if (!Number.isInteger(aiScore) || aiScore < 1 || aiScore > 5) {
      throw new Error(`Invalid AI-Assisted Score for ${item.code}`);
    }
    const selfScore = item.development?.self_score;
    if (selfScore !== null && (!Number.isInteger(selfScore) || selfScore < 1 || selfScore > 5)) {
      throw new Error(`Invalid Self Score for ${item.code}`);
    }
  }
  return review;
}
