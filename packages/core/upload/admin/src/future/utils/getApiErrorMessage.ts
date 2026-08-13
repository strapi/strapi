// `simpleQuery` in `packages/core/admin/admin/src/utils/baseQuery.ts` already
// unwraps the API envelope before returning, so every RTK Query error shape
// that reaches call sites here (`ApiError`, `UnknownApiError`, `SerializedError`)
// carries its message directly on `message` — never under a `data` key.
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const { message } = error as { message?: unknown };

  return typeof message === 'string' && message.length > 0 ? message : fallback;
};
