// `simpleQuery` in `packages/core/admin/admin/src/utils/baseQuery.ts` already
// unwraps the API envelope before returning, so every RTK Query error shape
// that reaches call sites here (`ApiError`, `UnknownApiError`, `SerializedError`)
// carries its message directly on `message` — never under a `data` key.
//
// The message is returned as-is: it can be a machine-readable code
// (`FileTooBig`) or a ready-made sentence, and only `useApiErrorMessage` knows
// how to tell those apart for display.
export const getApiErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const { message } = error as { message?: unknown };

  return typeof message === 'string' && message.length > 0 ? message : undefined;
};
