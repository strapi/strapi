import chalk from 'chalk';

export const handleError = (err: unknown, isSilent: boolean) => {
  if (!isSilent) {
    console.error(
      chalk.red(`[ERROR]\t[${new Date().toISOString()}]`),
      err instanceof Error ? err.message : err
    );
  }

  process.exit(1);
};
