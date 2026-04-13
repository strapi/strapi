import * as z from 'zod/v4';

import { ValidationError } from './errors';

/**
 * Re-export of the Zod v4 schema builder from the same version Strapi uses
 * internally. Use this for building schemas passed to content API param
 * registration (addQueryParams / addInputParams) so your code stays compatible
 * across Strapi minor/patch updates.
 *
 * @example
 * import { z } from '@strapi/utils';
 * strapi.contentAPI.addQueryParams({
 *   search: {
 *     schema: z.string().max(200).optional(),
 *     matchRoute: (route) => route.path.includes('articles'),
 *   },
 * });
 */
export { z };

export const validateZod =
  <T extends z.Schema>(schema: T) =>
  (data: unknown, errorMessage?: string): z.infer<T> => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { message, errors } = formatZodErrors(error);
        throw new ValidationError(errorMessage || message, { errors });
      }

      throw error;
    }
  };

const formatZodErrors = (zodError: z.ZodError) => ({
  errors: zodError.issues.map((issue) => {
    return {
      path: issue.path.map(String),
      message: issue.message,
      name: 'ValidationError',
      value: undefined,
    };
  }),
  message: zodError.issues[0]?.message ?? 'Validation error',
});

type FormErrors = Record<string, string>;

/**
 * Converts a ZodError into form-compatible errors matching
 * getYupValidationErrors from @strapi/admin Form component.
 *
 * Returns a flat object with dot-path keys and string error messages.
 * Only the first error per path is kept (matches Yup behavior).
 */
export const getZodValidationErrors = (error: z.ZodError): FormErrors => {
  const errors: FormErrors = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (path && !(path in errors)) {
      errors[path] = issue.message;
    }
  }

  return errors;
};
