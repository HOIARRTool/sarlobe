const DEFAULT_SKILL_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];

export function isSkillVersionPropagationError(error) {
  return (
    error?.status === 404 &&
    /Skill version ['"].+['"] for ['"].+['"] not found/i.test(String(error?.message || ""))
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withSkillVersionPropagationRetry(
  operation,
  { delays = DEFAULT_SKILL_RETRY_DELAYS_MS, wait = sleep, onRetry = () => {} } = {},
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isSkillVersionPropagationError(error) || attempt >= delays.length) throw error;
      const delayMs = delays[attempt];
      onRetry({ attempt: attempt + 1, delayMs, error });
      await wait(delayMs);
    }
  }
}
