import type { Options } from '../types';

const isCi = (value: string | undefined) => {
  if (value == null || value === '') {
    return false;
  }

  const normalized = value.toLowerCase();

  return normalized === 'true' || normalized === '1';
};

export const shouldSkipCloudLogin = (
  options: Pick<Options, 'skipCloud' | 'nonInteractive'>,
  env: NodeJS.ProcessEnv = process.env,
  stdinIsTTY: boolean = Boolean(process.stdin.isTTY)
) => {
  if (options.skipCloud || options.nonInteractive) {
    return true;
  }

  if (isCi(env.CI)) {
    return true;
  }

  return !stdinIsTTY;
};
