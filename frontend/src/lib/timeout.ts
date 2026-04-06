/**
 * withTimeout — race a promise against a deadline.
 * If the promise doesn't resolve within `ms`, rejects with a TimeoutError.
 * Use this on every external call (Supabase, Meilisearch, Shiprocket, etc.)
 * so serverless functions never hang indefinitely.
 */
export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
