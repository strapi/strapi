import { z, errors } from '@strapi/utils';

interface FormattedZodError {
  path: string[];
  message: string;
  name: 'ValidationError';
  value: undefined;
}

interface FormattedZodErrors {
  errors: FormattedZodError[];
  message: string;
}

/**
 * Transforms a ZodError into the same shape as formatYupErrors from @strapi/utils.
 * Only keeps the first error per path to match Yup behavior.
 */
const formatZodErrors = (zodError: z.ZodError): FormattedZodErrors => {
  const seen = new Set<string>();
  const formattedErrors: FormattedZodError[] = [];

  for (const issue of zodError.issues) {
    const key = issue.path.join('.');
    if (!seen.has(key)) {
      seen.add(key);
      formattedErrors.push({
        path: issue.path.map(String),
        message: issue.message,
        name: 'ValidationError',
        value: undefined,
      });
    }
  }

  return {
    errors: formattedErrors,
    message: zodError.issues[0]?.message ?? 'Validation error',
  };
};

/**
 * Zod schema for Strapi entity IDs.
 * Matches the StrapiIDSchema from @strapi/utils/yup:
 * accepts strings or non-negative integers.
 */
const strapiID = z.union([z.string(), z.number().int().nonnegative()]);

/**
 * Async Zod validator matching the signature of validateYupSchema from @strapi/utils.
 *
 * Usage:
 *   const validate = validateZodAsync(mySchema);
 *   const data = await validate(body);            // throws ValidationError on failure
 *   const data = await validate(body, 'Custom');  // throws with custom message
 */
const validateZodAsync =
  <T extends z.Schema>(schema: T) =>
  async (data: unknown, errorMessage?: string): Promise<z.infer<T>> => {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { message, errors: formattedErrors } = formatZodErrors(error);
        throw new errors.ValidationError(errorMessage || message, {
          errors: formattedErrors,
        });
      }
      throw error;
    }
  };

export { formatZodErrors, strapiID, validateZodAsync };
export type { FormattedZodError, FormattedZodErrors };
