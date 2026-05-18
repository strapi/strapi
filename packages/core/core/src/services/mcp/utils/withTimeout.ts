/**
 * Wraps a promise with a timeout to prevent hanging operations
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
