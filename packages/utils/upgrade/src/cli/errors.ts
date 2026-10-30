import { styleText } from 'node:util';

import { AbortedError } from '../modules/error';

export const handleError = (err: unknown, isSilent: boolean) => {
  // If the upgrade process has been aborted, exit silently
  if (err instanceof AbortedError) {
    process.exit(0);
  }

  if (!isSilent) {
    console.error(
      styleText('red', `[ERROR]\t[${new Date().toISOString()}]`),
      err instanceof Error ? err.message : err
    );
  }

  process.exit(1);
};
