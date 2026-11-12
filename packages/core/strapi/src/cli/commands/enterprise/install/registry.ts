import { BILLING_URL } from './constants';
import { toPrintableText } from './printable-text';

const REQUEST_TIMEOUT_MS = 15 * 1000;

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

// A redirect fails the request, so the license is never sent to a server that was not asked for.
const buildRequestInit = (license: string): RequestInit => ({
  headers: { Authorization: `Bearer ${license}`, Accept: 'application/json' },
  signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  redirect: 'error',
});

// Node's fetch rejects with this cause when a request with `redirect: 'error'` is redirected.
const isRedirectError = (error: unknown): boolean =>
  (error as { cause?: { message?: unknown } } | undefined)?.cause?.message ===
  'unexpected redirect';

const describeRedirect = (registryUrl: string) =>
  `${registryUrl} redirected the request. Use the final registry URL.`;

const describeRejectedLicense = (registryUrl: string) =>
  `${registryUrl} rejected this Strapi license. Check it at ${BILLING_URL}`;

export const fetchPackument = async ({
  registryUrl,
  packageName,
  license,
  fetchImplementation,
}: {
  registryUrl: string;
  packageName: string;
  license: string;
  fetchImplementation: typeof fetch;
}): Promise<PackumentLookup> => {
  let response: Response;

  try {
    // `@scope/name` as is: the Strapi registry redirects `@scope%2fname` to it.
    response = await fetchImplementation(
      `${registryUrl}/${packageName}`,
      buildRequestInit(license)
    );
  } catch (error) {
    return {
      status: 'unavailable',
      message: isRedirectError(error)
        ? describeRedirect(registryUrl)
        : `Could not reach ${registryUrl}. Check your network connection and try again.`,
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

export interface CatalogPlugin {
  name: string;
  displayName?: string;
  description?: string;
  kind?: string;
  licensed: boolean;
}

type CatalogResult =
  | {
      status: 'available';
      plugins: CatalogPlugin[];
      notLicensedMessage?: string;
    }
  | { status: 'license-rejected'; message: string }
  | { status: 'redirected'; message: string }
  | { status: 'unavailable' };

const parseCatalogPlugin = (plugin: unknown): CatalogPlugin | undefined => {
  if (typeof plugin !== 'object' || plugin === null) {
    return undefined;
  }

  const { name, displayName, description, kind, licensed } = plugin as Record<string, unknown>;

  if (typeof name !== 'string' || typeof licensed !== 'boolean') {
    return undefined;
  }

  return {
    name,
    displayName: toPrintableText(displayName),
    description: toPrintableText(description),
    kind: toPrintableText(kind),
    licensed,
  };
};

export const fetchPluginCatalog = async ({
  registryUrl,
  license,
  fetchImplementation,
}: {
  registryUrl: string;
  license: string;
  fetchImplementation: typeof fetch;
}): Promise<CatalogResult> => {
  try {
    const response = await fetchImplementation(
      `${registryUrl}/-/strapi/plugins`,
      buildRequestInit(license)
    );

    if (response.status === 401) {
      return { status: 'license-rejected', message: describeRejectedLicense(registryUrl) };
    }

    if (!response.ok) {
      return { status: 'unavailable' };
    }

    const catalog: unknown = await response.json();

    if (typeof catalog !== 'object' || catalog === null) {
      return { status: 'unavailable' };
    }

    const { plugins, notLicensedMessage } = catalog as Record<string, unknown>;

    if (!Array.isArray(plugins)) {
      return { status: 'unavailable' };
    }

    return {
      status: 'available',
      plugins: plugins
        .map(parseCatalogPlugin)
        .filter((plugin): plugin is CatalogPlugin => plugin !== undefined),
      notLicensedMessage: toPrintableText(notLicensedMessage),
    };
  } catch (error) {
    return isRedirectError(error)
      ? { status: 'redirected', message: describeRedirect(registryUrl) }
      : { status: 'unavailable' };
  }
};
