import chalk from 'chalk';

export const handleError = (err: unknown) => {
  console.error(
    chalk.red(`[ERROR]\t[${new Date().toISOString()}]`),
    err instanceof Error ? err.message : err
  );
  process.exit(1);
};
