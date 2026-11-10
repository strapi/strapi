import { translatedErrors } from '@strapi/admin/strapi-admin';

import type { FormErrors } from '@strapi/admin/strapi-admin';

type FieldError = string | { id: string; defaultMessage: string };

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

/**
 * What a form shows under a field for a message of the server. A required value the server found
 * missing reads as the admin's own "required", and no key of the request shows in backticks.
 */
const describeFieldError = (message: string): FieldError =>
  /\bis missing$/.test(message) ? translatedErrors.required : message.replace(/`/g, '');

/** The errors of a refused save as a form holds them: nested by the path of each field */
const getFormErrors = (error: unknown): FormErrors => {
  const errors: Record<string, unknown> = {};

  for (const [path, message] of Object.entries(getFieldErrors(error))) {
    const steps = path.split('.');
    let at = errors;

    steps.slice(0, -1).forEach((step) => {
      at = (at[step] ??= {}) as Record<string, unknown>;
    });
    at[steps[steps.length - 1]] = describeFieldError(message);
  }

  return errors as FormErrors;
};

export { describeFieldError, getFormErrors };
