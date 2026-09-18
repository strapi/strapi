import { BlastRadiusError, ExitCode } from './errors';

export const usage = 'Usage: yarn tsx scripts/blast-radius/index.ts [--json]';
export type CliArgs = { json: boolean };

export function parseCliArgs(argv: readonly string[]): CliArgs {
  if (argv.length === 0) return { json: false };
  if (argv.length === 1 && argv[0] === '--json') return { json: true };
  throw new BlastRadiusError(ExitCode.InvalidInput, usage);
}
