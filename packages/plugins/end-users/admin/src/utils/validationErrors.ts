/**
 * The field errors of a refused save, keyed by the dotted path the form names its fields by
 * (`redirects.emailVerified`). The server answers `details.errors[]`, each with an array `path`.
 */
const getFieldErrors = (error: unknown): Record<string, string> => {
  const errors = (error as { details?: { errors?: unknown } } | undefined)?.details?.errors;

  if (!Array.isArray(errors)) {
    return {};
  }

  return Object.fromEntries(
    errors
      .filter(
        (entry): entry is { path: unknown[]; message: string } =>
          Array.isArray(entry?.path) && typeof entry?.message === 'string'
      )
      .map((entry) => [entry.path.join('.'), entry.message])
  );
};

export { getFieldErrors };
