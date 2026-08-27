export function validateReview(review, standard) {
  if (!review || typeof review !== "object") throw new Error("AI output is not an object");
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
