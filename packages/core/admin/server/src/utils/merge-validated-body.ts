export function mergeValidatedBody<T extends object>(input: T, validatedPayload: unknown): T {
  if (
    validatedPayload !== null &&
    typeof validatedPayload === 'object' &&
    !Array.isArray(validatedPayload)
  ) {
    return { ...input, ...(validatedPayload as object) };
  }

  return { ...input };
}
