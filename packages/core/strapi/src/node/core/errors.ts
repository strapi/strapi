import boxen from 'boxen';
import chalk from 'chalk';
import os from 'node:os';
import { errors } from '@strapi/utils';

const isError = (err: unknown): err is Error => err instanceof Error;

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
    // eslint-disable-next-line no-console
    console.log(
      chalk.red(
        boxen(err.stack, {
          padding: 1,
          align: 'left',
        })
      )
    );
  }

  if (err instanceof errors.YupValidationError) {
    const message = [];
    const size = err.details.errors.length;

    for (const error of err.details.errors) {
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
