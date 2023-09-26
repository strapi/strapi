import boxen from 'boxen';
import chalk from 'chalk';
import os from 'os';

import { isError } from '../node/core/errors';

export const handleError = (err: unknown) => {
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

  process.exit(1);
};
