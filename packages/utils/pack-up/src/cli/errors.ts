import boxen from 'boxen';
import chalk from 'chalk';

export const handleError = (err: unknown) => {
  console.error(
    chalk.red(
      `[ERROR] `,
      'There seems to be an unexpected error, try again with --debug for more information \n'
    )
  );

  if (err instanceof Error && err.stack) {
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
