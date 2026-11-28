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

interface FormErrorsOptions {
  /** Whether a field of the form reads this dotted path: an error for any other has nowhere to show */
  isShown: (path: string) => boolean;
  /** Names a path as the form does, where the server names it differently (a secret field) */
  rename?: (path: string) => string;
}

/**
 * The errors of a refused save as a form holds them: nested by the path of each field, and only
 * those a rendered field reads. `unshown` says some error was left over (a path the form has no
 * field for, such as the whole provider), so the caller tells the server's own message instead.
 */
const getFormErrors = (
  error: unknown,
  { isShown, rename = (path) => path }: FormErrorsOptions
): { errors: FormErrors; unshown: boolean } => {
  const errors: Record<string, unknown> = {};
  let unshown = false;

  for (const [serverPath, message] of Object.entries(getFieldErrors(error))) {
    const path = rename(serverPath);

    if (path === '' || !isShown(path)) {
      unshown = true;
      continue;
    }

    const steps = path.split('.');
    let at = errors;

    steps.slice(0, -1).forEach((step) => {
      at = (at[step] ??= {}) as Record<string, unknown>;
    });
    at[steps[steps.length - 1]] = describeFieldError(message);
  }

  return { errors: errors as FormErrors, unshown };
};

/** The dotted paths of every value of a patch (an array is one value): what a form has fields for */
const leafPaths = (value: unknown, prefix = ''): string[] =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.entries(value).flatMap(([key, child]) =>
        leafPaths(child, prefix === '' ? key : `${prefix}.${key}`)
      )
    : [prefix];

export { describeFieldError, getFormErrors, leafPaths };
