import { compareStable, highestStable, parseStable } from './semver.ts';

export const REGISTRY_URL = 'https://registry.npmjs.org';
export const PACKAGE_NAME = '@strapi/strapi';

/** The narrow read of an npm packument this action depends on. */
type Packument = {
  'dist-tags'?: { latest?: unknown } | null;
  versions?: Record<string, unknown> | null;
};

function fail(reason: string): never {
  throw new Error(`Cannot resolve the published ${PACKAGE_NAME} baseline: ${reason}.`);
}

function isPackument(value: unknown): value is Packument {
  return typeof value === 'object' && value !== null;
}

/**
 * Resolves the released baseline from an npm packument.
 *
 * The `latest` dist-tag alone is not trusted. A rolled-back or mis-targeted dist-tag would point
 * the release range at the wrong commit and silently produce a release containing work that already
 * shipped, so `latest` must also be the highest published stable version.
 */
export function resolveLatestVersion(packument: unknown): string {
  if (isPackument(packument) === false) {
    return fail('the registry response is not an object');
  }

  const latest = packument['dist-tags']?.latest;
  const parsedLatest = parseStable(latest);

  if (parsedLatest === null) {
    return fail(`the "latest" dist-tag is not a stable version (got ${JSON.stringify(latest)})`);
  }

  const published = Object.keys(packument.versions ?? {});

  if (published.length === 0) {
    return fail('the registry response carries no published versions');
  }

  const highest = highestStable(published);
  const parsedHighest = highest === null ? null : parseStable(highest);

  if (parsedHighest === null) {
    return fail('the registry response carries no stable published version');
  }

  if (compareStable(parsedLatest, parsedHighest) !== 0) {
    return fail(
      `the "latest" dist-tag is ${String(latest)} but the highest published stable version is ` +
        `${highest}. Resolve the dist-tag before drafting a release`
    );
  }

  return String(latest).trim();
}

/** The HTTP surface used to read the registry, so tests never touch the network. */
export type RegistryRequest = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/**
 * Reads a packument over plain HTTP.
 *
 * The package is public, so no credentials are involved and the workspace does not need to be
 * installed for this step.
 */
export async function fetchPackument(
  request: RegistryRequest,
  name: string = PACKAGE_NAME
): Promise<unknown> {
  // `encodeURIComponent`, not a substitution of the one separator a scoped name happens to have.
  // A hand-written substitution encodes the first occurrence only, so any further reserved
  // character in the name would reach the registry raw and address a different path than this
  // function was asked for.
  const url = `${REGISTRY_URL}/${encodeURIComponent(name)}`;
  const response = await request(url);

  if (response.ok === false) {
    throw new Error(`The npm registry answered ${response.status} for ${name}.`);
  }

  return response.json();
}
