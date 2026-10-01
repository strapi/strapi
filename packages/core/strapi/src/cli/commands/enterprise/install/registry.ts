import { ENTERPRISE_REGISTRY_URL } from './constants';
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
  | { status: 'license-rejected' }
  | { status: 'not-licensed' }
  | { status: 'not-found' };

export const getRegistryUrl = (env: NodeJS.ProcessEnv = process.env): string => {
  const registryUrl = env.STRAPI_ENTERPRISE_REGISTRY_URL?.trim() || ENTERPRISE_REGISTRY_URL;

  if (!URL.canParse(registryUrl)) {
    throw new EnterpriseInstallError(
      `STRAPI_ENTERPRISE_REGISTRY_URL is not a valid URL: ${registryUrl}`
    );
  }

  return registryUrl.replace(/\/+$/, '');
};

const authorizationHeader = (license: string) => ({ Authorization: `Bearer ${license}` });

export const searchPackageNames = async ({
  text,
  license,
  env = process.env,
  fetchImplementation = fetch,
}: {
  text: string;
  license: string;
  env?: NodeJS.ProcessEnv;
  fetchImplementation?: typeof fetch;
}): Promise<string[] | undefined> => {
  const searchUrl = `${getRegistryUrl(env)}/-/v1/search?text=${encodeURIComponent(text)}&size=${SEARCH_PAGE_SIZE}`;

  try {
    const response = await fetchImplementation(searchUrl, {
      headers: authorizationHeader(license),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return undefined;
    }

    const { objects } = (await response.json()) as {
      objects?: Array<{ package?: { name?: unknown } }>;
    };

    return (objects ?? [])
      .map((searchResult) => searchResult.package?.name)
      .filter((packageName): packageName is string => typeof packageName === 'string');
  } catch {
    return undefined;
  }
};

export const fetchPackument = async ({
  packageName,
  license,
  env = process.env,
  fetchImplementation = fetch,
}: {
  packageName: string;
  license: string;
  env?: NodeJS.ProcessEnv;
  fetchImplementation?: typeof fetch;
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
    throw new EnterpriseInstallError(
      `Could not reach ${registryUrl}. Check your network connection and try again.`
    );
  }

  if (response.status === 401) {
    return { status: 'license-rejected' };
  }

  if (response.status === 403) {
    return { status: 'not-licensed' };
  }

  if (response.status === 404) {
    return { status: 'not-found' };
  }

  if (!response.ok) {
    throw new EnterpriseInstallError(
      `${registryUrl} answered HTTP ${response.status} for ${packageName}. Try again later.`
    );
  }

  const packument: unknown = await response.json().catch(() => undefined);

  if (typeof packument !== 'object' || packument === null) {
    throw new EnterpriseInstallError(
      `${registryUrl} answered with invalid data for ${packageName}. Try again later.`
    );
  }

  return { status: 'available', packument: packument as Packument };
};
