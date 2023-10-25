import chalk from 'chalk';
import os from 'node:os';

export const handleError = (err: unknown) => {
  console.error(
    chalk.red(
      `[ERROR] `,
      'There seems to be an unexpected error, try again with --debug for more information',
      os.EOL
    )
  );
};
