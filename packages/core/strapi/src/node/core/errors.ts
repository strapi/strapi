import boxen from 'boxen';
import chalk from 'chalk';
import os from 'node:os';
import { errors } from '@strapi/utils';

const isError = (err: unknown): err is Error => err instanceof Error;

type ValidationErrorDetail = { name: string; message: string; value?: unknown };

/**
 * A validation error that lists its issues in `details.errors`: every `YupValidationError`, and
 * a `ValidationError` thrown by a zod validator that formats its issues the same way.
 */
const hasValidationDetails = (
  err: unknown
): err is errors.ValidationError<string, { errors: ValidationErrorDetail[] }> => {
  if (err instanceof errors.ValidationError === false) {
    return false;
  }

  const { details } = err as errors.ValidationError;

  return (
    typeof details === 'object' &&
    details !== null &&
    'errors' in details &&
    Array.isArray(details.errors) === true
  );
};

/**
 * @description Handle unexpected errors. No, but really, your CLI should anticipate error cases.
 * If a user hits an error we don't expect, then we need to flag to them that this is not normal
 * and they should use the `--debug` flag to get more information (assuming you've implemented this
 * in your action).
 */
const handleUnexpectedError = (err: unknown) => {
  console.error(
    chalk.red(
      `[ERROR] `,
      'There seems to be an unexpected error, try again with --debug for more information',
      os.EOL
    )
  );

  if (isError(err) && err.stack) {
    console.log(
      chalk.red(
        boxen(err.stack, {
          padding: 1,
          align: 'left',
        })
      )
    );
  }

  if (hasValidationDetails(err)) {
    const message = [];
    // Plugin code can throw a ValidationError with malformed entries: print only the objects.
    const details = (err.details.errors as unknown[]).filter(
      (error): error is ValidationErrorDetail => typeof error === 'object' && error !== null
    );
    const size = details.length;

    for (const error of details) {
      // No need to repeat the error message as it's the same as the err.message
      if (size === 1) {
        message.push(`  value: ${error.value}`);
        continue;
      }

      message.push(
        [`  [${error.name}]`, `    message: ${error.message}`, `      value: ${error.value}`].join(
          '\n'
        )
      );
    }

    console.log(
      chalk.red(
        boxen(['Details:', message.join('\n\n')].join('\n'), {
          padding: 1,
          align: 'left',
        })
      )
    );
  }

  process.exit(1);
};

export { handleUnexpectedError, isError };
