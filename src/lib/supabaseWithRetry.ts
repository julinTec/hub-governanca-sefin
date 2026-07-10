/**
 * Wrapper utilities to make Supabase / async calls more resilient:
 * - Explicit timeout (default 15s)
 * - Automatic retry with exponential backoff on network / abort errors
 *
 * Usage:
 *   const { data, error } = await withRetry(() =>
 *     supabase.from('okr_objetivos').select('*')
 *   );
 */

export interface RetryOptions {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operação excedeu ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

function isRetriable(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed')
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { timeoutMs = 15000, retries = 2, backoffMs = 600 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetriable(err)) throw err;
      await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}
