import os from 'os';
import path from 'path';
import fse from 'fs-extra';

import type { Logger } from '../../../../utils/logger';
import type { StrapiPackageMetadata } from '../registry';

export const createTemporaryDirectory = (): Promise<string> =>
  fse.mkdtemp(path.join(os.tmpdir(), 'strapi-enterprise-install-'));

export const createTestLogger = () =>
  ({
    warnings: 0,
    errors: 0,
    debug: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    spinner: jest.fn(),
    progressBar: jest.fn(),
  }) as unknown as jest.Mocked<Logger>;

/** Every message the logger received, as one string, for "was it said" and "was it leaked" checks. */
export const loggedText = (logger: jest.Mocked<Logger>): string =>
  JSON.stringify([logger.info, logger.success, logger.warn, logger.error].map((m) => m.mock.calls));

/** The permission bits of a file, such as `600`. */
export const readFilePermissions = async (filePath: string): Promise<string> =>
  (await fse.stat(filePath)).mode.toString(8).slice(-3);

/** A minimal `fetch` response, since the Jest environment here does not provide `Response`. */
export const createFetchResponse = (status: number, body?: unknown) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }) as unknown as Response;

export const createPackument = (
  packageName: string,
  versions: Array<{
    version: string;
    strapiRange?: string;
    deprecated?: string;
    strapi?: StrapiPackageMetadata;
  }>,
  { latest }: { latest?: string } = {}
) => ({
  name: packageName,
  ...(latest ? { 'dist-tags': { latest } } : {}),
  versions: Object.fromEntries(
    versions.map(({ version, strapiRange, deprecated, strapi }) => [
      version,
      {
        version,
        ...(strapiRange ? { peerDependencies: { '@strapi/strapi': strapiRange } } : {}),
        ...(deprecated ? { deprecated } : {}),
        ...(strapi ? { strapi } : {}),
      },
    ])
  ),
});

/**
 * A fake registry for `fetch`. The search answers with the given names, or with an HTTP status.
 * Each package answers with its packument, or with an HTTP status, and a missing one with 404.
 */
export const createRegistryFetch = ({
  searchResult,
  packuments,
}: {
  searchResult: string[] | number;
  packuments: Record<string, unknown>;
}) =>
  jest.fn(async (url: string) => {
    const { pathname } = new URL(url);

    if (pathname === '/-/v1/search') {
      return typeof searchResult === 'number'
        ? createFetchResponse(searchResult)
        : createFetchResponse(200, {
            objects: searchResult.map((packageName) => ({ package: { name: packageName } })),
          });
    }

    const packument = packuments[decodeURIComponent(pathname.slice(1))];

    if (packument === undefined) {
      return createFetchResponse(404);
    }

    return typeof packument === 'number'
      ? createFetchResponse(packument)
      : createFetchResponse(200, packument);
  });

/**
 * Writes an installed package into the app's node_modules and, like a package manager, lists it in
 * the app's package.json. `asDependency: false` leaves it out, like a copy hoisted for another app.
 */
export const installFakePackage = async (
  appDir: string,
  packageName: string,
  packageJson: Record<string, unknown>,
  { asDependency = true }: { asDependency?: boolean } = {}
) => {
  await fse.outputJson(path.join(appDir, 'node_modules', packageName, 'package.json'), packageJson);

  if (asDependency) {
    const appPackageJsonPath = path.join(appDir, 'package.json');
    const appPackageJson = await fse.readJson(appPackageJsonPath).catch(() => ({}));

    await fse.outputJson(appPackageJsonPath, {
      ...appPackageJson,
      dependencies: { ...appPackageJson.dependencies, [packageName]: String(packageJson.version) },
    });
  }
};
