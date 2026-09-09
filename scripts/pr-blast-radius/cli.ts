import { BlastRadiusError, ExitCode } from './errors';

export const usage =
  'Usage: yarn tsx scripts/pr-blast-radius/index.ts <number|https://github.com/strapi/strapi/pull/<number>> [--json]';

export type CliArgs = { repository: 'strapi/strapi'; pullRequest: number; json: boolean };

function numberFrom(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function parseReference(value: string): number | undefined {
  const bare = numberFrom(value);
  if (bare !== undefined) return bare;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    url.username ||
    url.password ||
    url.port
  )
    return undefined;
  const match = /^\/strapi\/strapi\/pull\/(\d+)\/?$/.exec(url.pathname);
  return match === null ? undefined : numberFrom(match[1]);
}

export function parseCliArgs(argv: readonly string[]): CliArgs {
  const jsonCount = argv.filter((value) => value === '--json').length;
  const positional = argv.filter((value) => value !== '--json');
  if (
    jsonCount > 1 ||
    positional.length !== 1 ||
    positional[0] === '--' ||
    positional.some((value) => value.startsWith('-'))
  ) {
    throw new BlastRadiusError(ExitCode.InvalidInput, usage);
  }
  const pullRequest = parseReference(positional[0]);
  if (pullRequest === undefined)
    throw new BlastRadiusError(
      ExitCode.InvalidInput,
      `${usage}\nOnly strapi/strapi pull request numbers or canonical URLs are accepted.`
    );
  return { repository: 'strapi/strapi', pullRequest, json: jsonCount === 1 };
}
