/**
 * Merges Yup's validated output onto the raw request body.
 *
 * `validateYupSchema(schema)` returns transformed fields (e.g. email lowercasing, trimmed strings)
 * without mutating the original object. Controllers must merge that result before uniqueness checks
 * and persistence, otherwise `exists()` / DB writes use different values than validation.
 */
export function mergeValidatedBody<T extends object>(input: T, validatedPayload: unknown): T {
  if (
    validatedPayload != null &&
    typeof validatedPayload === 'object' &&
    !Array.isArray(validatedPayload)
  ) {
    return { ...input, ...(validatedPayload as object) };
  }

  return { ...input };
}
