import test from "node:test";
import assert from "node:assert/strict";
import {
  isSkillVersionPropagationError,
  withSkillVersionPropagationRetry,
} from "../src/openai-retry.js";

function skillNotReady() {
  const error = new Error("404 Skill version '2' for 'skill_example' not found.");
  error.status = 404;
  return error;
}

test("skill-version propagation errors are identified narrowly", () => {
  assert.equal(isSkillVersionPropagationError(skillNotReady()), true);
  assert.equal(isSkillVersionPropagationError(Object.assign(new Error("Not found"), { status: 404 })), false);
  assert.equal(isSkillVersionPropagationError(Object.assign(new Error("Skill version '2' for 'skill_example' not found."), { status: 400 })), false);
});

test("OpenAI request retries a newly uploaded skill version and then succeeds", async () => {
  let attempts = 0;
  const waits = [];
  const result = await withSkillVersionPropagationRetry(
    async () => {
      attempts += 1;
      if (attempts < 3) throw skillNotReady();
      return "accepted";
    },
    {
      delays: [10, 20, 30],
      wait: async (ms) => waits.push(ms),
    },
  );

  assert.equal(result, "accepted");
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [10, 20]);
});

test("unrelated OpenAI errors are not retried", async () => {
  let attempts = 0;
  const error = Object.assign(new Error("Quota exceeded"), { status: 429 });
  await assert.rejects(
    withSkillVersionPropagationRetry(async () => {
      attempts += 1;
      throw error;
    }),
    error,
  );
  assert.equal(attempts, 1);
});
