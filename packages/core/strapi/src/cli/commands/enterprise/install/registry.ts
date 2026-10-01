import { BILLING_URL, ENTERPRISE_REGISTRY_URL } from './constants';
import { EnterpriseInstallError } from './errors';

const REQUEST_TIMEOUT_MS = 15 * 1000;
const SEARCH_PAGE_SIZE = 250;

export interface StrapiPackageMetadata {
  name?: string;
  displayName?: string;
  description?: string;
  kind?: string;
}

export interface PackumentVersion {
  version: string;
  description?: string;
  deprecated?: string;
  peerDependencies?: Record<string, string>;
  strapi?: StrapiPackageMetadata;
}

export interface Packument {
  name: string;
  'dist-tags'?: Record<string, string>;
  versions?: Record<string, PackumentVersion>;
}

export type PackumentLookup =
  | { status: 'available'; packument: Packument }
  | { status: 'license-rejected'; message: string }
  | { status: 'not-licensed' }
  | { status: 'not-found' }
  | { status: 'unavailable'; message: string };

export const getRegistryUrl = (env: NodeJS.ProcessEnv): string => {
  const registryUrl = env.STRAPI_ENTERPRISE_REGISTRY_URL?.trim() || ENTERPRISE_REGISTRY_URL;

  if (!URL.canParse(registryUrl)) {
    throw new EnterpriseInstallError(
      `STRAPI_ENTERPRISE_REGISTRY_URL is not a valid URL: ${registryUrl}`
    );
  }

  return registryUrl.replace(/\/+$/, '');
};

const authorizationHeader = (license: string) => ({ Authorization: `Bearer ${license}` });

const describeRejectedLicense = (registryUrl: string) =>
  `${registryUrl} rejected this Strapi license. Check it at ${BILLING_URL}`;

export type SearchResult =
  | { status: 'available'; packageNames: string[] }
  | { status: 'license-rejected'; message: string }
  /** The search could not be reached, failed, or answered with invalid data. */
  | { status: 'unavailable' };

export const searchPackageNames = async ({
  text,
  license,
  env,
  fetchImplementation,
}: {
  text: string;
  license: string;
  env: NodeJS.ProcessEnv;
  fetchImplementation: typeof fetch;
}): Promise<SearchResult> => {
  const registryUrl = getRegistryUrl(env);
  const searchUrl = `${registryUrl}/-/v1/search?text=${encodeURIComponent(text)}&size=${SEARCH_PAGE_SIZE}`;

  try {
    const response = await fetchImplementation(searchUrl, {
      headers: authorizationHeader(license),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 401) {
      return { status: 'license-rejected', message: describeRejectedLicense(registryUrl) };
    }

    if (!response.ok) {
      return { status: 'unavailable' };
    }

    const { objects } = (await response.json()) as {
      objects?: Array<{ package?: { name?: unknown } }>;
    };

    const packageNames = (objects ?? [])
      .map((searchResult) => searchResult.package?.name)
      .filter((packageName): packageName is string => typeof packageName === 'string');

    return { status: 'available', packageNames };
  } catch {
    return { status: 'unavailable' };
  }
};

export const fetchPackument = async ({
  packageName,
  license,
  env,
  fetchImplementation,
}: {
  packageName: string;
  license: string;
  env: NodeJS.ProcessEnv;
  fetchImplementation: typeof fetch;
}): Promise<PackumentLookup> => {
  const registryUrl = getRegistryUrl(env);
  let response: Response;

  try {
    // `@scope/name` as is: the Strapi registry redirects `@scope%2fname` to it.
    response = await fetchImplementation(`${registryUrl}/${packageName}`, {
      headers: { ...authorizationHeader(license), Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return {
      status: 'unavailable',
      message: `Could not reach ${registryUrl}. Check your network connection and try again.`,
    };
  }

  if (response.status === 401) {
    return {
      status: 'license-rejected',
      message: describeRejectedLicense(registryUrl),
    };
  }

  if (response.status === 403) {
    return { status: 'not-licensed' };
  }

  if (response.status === 404) {
    return { status: 'not-found' };
  }

  if (!response.ok) {
    return {
      status: 'unavailable',
      message: `${registryUrl} answered HTTP ${response.status} for ${packageName}. Try again later.`,
    };
  }

  const packument: unknown = await response.json().catch(() => undefined);

  if (typeof packument !== 'object' || packument === null) {
    return {
      status: 'unavailable',
      message: `${registryUrl} answered with invalid data for ${packageName}. Try again later.`,
    };
  }

  return { status: 'available', packument: packument as Packument };
};
