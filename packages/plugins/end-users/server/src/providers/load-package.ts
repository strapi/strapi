import { isProviderDefinition } from './define-provider';
import type { ProviderDefinition } from './define-provider';

const PREFIX = '@strapi/provider-end-users-';

const isModuleNotFound = (error: unknown) =>
  error !== null &&
  typeof error === 'object' &&
  'code' in error &&
  error.code === 'MODULE_NOT_FOUND';

/**
 * Loads a provider package the way the email and upload plugins load theirs: `name` tries
 * `@strapi/provider-end-users-<name>` first, then the name as given, and only a missing module
 * moves on to the next. The default export must be the result of `defineProvider()`.
 *
 * `paths` are where Node looks first, the project's folder in a running application. Throws
 * `Error` whose message says what went wrong; the caller names the config entry.
 */
export const loadProviderPackage = (name: string, paths: string[] = []): ProviderDefinition => {
  const resolveFrom = (request: string) =>
    require.resolve(request, { paths: [...paths, __dirname] });

  let modulePath: string;

  try {
    modulePath = resolveFrom(`${PREFIX}${name.toLowerCase()}`);
  } catch (error) {
    if (!isModuleNotFound(error)) {
      throw error;
    }

    try {
      modulePath = resolveFrom(name);
    } catch (second) {
      if (!isModuleNotFound(second)) {
        throw second;
      }

      throw new Error(
        `the package could not be resolved: neither "${PREFIX}${name.toLowerCase()}" nor "${name}" is installed`
      );
    }
  }

  let loaded: unknown;

  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    loaded = require(modulePath);
  } catch (error) {
    throw new Error(
      `the package at ${modulePath} could not be loaded${error instanceof Error ? `: ${error.message}` : ''}`
    );
  }

  const exported =
    loaded !== null && typeof loaded === 'object' && 'default' in loaded
      ? (loaded as { default: unknown }).default
      : loaded;

  if (!isProviderDefinition(exported)) {
    throw new Error(
      `its default export is not the result of defineProvider(), imported from '@strapi/plugin-end-users/providers'`
    );
  }

  return exported;
};
