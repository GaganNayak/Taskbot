// Fixed-window limiter that protects model quota. In-memory: single process only.
export const createRateLimiter = (max: number, windowMs: number, now: () => number = Date.now) => {
  let windowStart = now();
  let count = 0;

  return (): boolean => {
    if (now() - windowStart >= windowMs) {
      windowStart = now();
      count = 0;
    }

    count += 1;
    return count <= max;
  };
};
