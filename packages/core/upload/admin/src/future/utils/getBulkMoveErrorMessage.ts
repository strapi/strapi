export const getBulkMoveErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message?: unknown };

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return fallback;
};
