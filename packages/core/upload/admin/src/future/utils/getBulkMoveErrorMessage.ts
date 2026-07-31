const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

export const getBulkMoveErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const rtkError = error as {
    message?: unknown;
    data?: { error?: { message?: unknown }; message?: unknown };
  };

  const candidates = [rtkError.data?.error?.message, rtkError.data?.message, rtkError.message];

  for (const candidate of candidates) {
    if (isNonEmptyString(candidate)) {
      return candidate;
    }
  }

  return fallback;
};
