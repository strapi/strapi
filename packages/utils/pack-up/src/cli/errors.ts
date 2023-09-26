import boxen from 'boxen';
import chalk from 'chalk';
import os from 'os';

export const handleError = (err: unknown) => {
  console.error(
    chalk.red(
      `[ERROR] `,
      'There seems to be an unexpected error, try again with --debug for more information',
      os.EOL
    )
  );

  if (err instanceof Error && err.stack) {
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
