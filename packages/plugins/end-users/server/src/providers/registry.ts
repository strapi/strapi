import type { Core } from '@strapi/types';

import { BUILT_IN_PROVIDERS } from './built-in';
import { RESERVED_PROVIDER_IDS, resolveOptions } from './define-provider';
import type { ProviderDefinition } from './define-provider';
import { loadProviderPackage } from './load-package';

export interface ConfiguredProvider {
  definition: ProviderDefinition;
  options: Record<string, unknown>;
  enabled: boolean;
}

export interface ProviderRegistry {
  /** The built-ins and the installed packages. */
  available(): ProviderDefinition[];
  /** The providers configured in `config/plugins.ts`; the admin shows them read-only. */
  fromConfig(): ConfiguredProvider[];
  get(id: string): ProviderDefinition | undefined;
  /** The package name as written in `config/plugins.ts` for a provider a package brought; `null` for a built-in. */
  packageOf(id: string): string | null;
}

const CONFIG_KEY = 'providers';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The providers of the end-users plugin: Better Auth's own, and the packages named in
 * `config/plugins.ts`. Reading the config loads every package, so a mistake in it stops the
 * application when this is called at start-up, naming `config/plugins.ts` and the entry.
 */
export const registry = (strapi: Core.Strapi): ProviderRegistry => {
  const entries: unknown[] = strapi.config.get('plugin::end-users.providers', []) ?? [];
  const appRoot = strapi.dirs?.app?.root;

  const builtIns = new Map(BUILT_IN_PROVIDERS.map((definition) => [definition.id, definition]));
  const packages = new Map<string, ProviderDefinition>();
  /** The package each definition came from, so one package named twice is not a clash. */
  const fromPackage = new Map<string, string>();
  const configured: ConfiguredProvider[] = [];
  const configuredIds = new Set<string>();

  const loadPackage = (name: string, where: string): ProviderDefinition => {
    let definition: ProviderDefinition;

    try {
      definition = loadProviderPackage(name, appRoot ? [appRoot] : []);
    } catch (error) {
      throw new Error(`${where}: ${messageOf(error)}.`);
    }

    // A package's definition is read as it was built, so its id is judged here too
    if (RESERVED_PROVIDER_IDS.includes(definition.id)) {
      throw new Error(
        `${where}: its provider id "${definition.id}" is reserved by the sign-in engine, choose another.`
      );
    }

    const known = fromPackage.get(definition.id);

    if (known === name) {
      return packages.get(definition.id) as ProviderDefinition;
    }

    if (builtIns.has(definition.id) || known !== undefined) {
      throw new Error(
        `${where}: its provider id "${definition.id}" is already taken by ${
          known !== undefined ? `the package "${known}"` : 'a built-in provider'
        }.`
      );
    }

    packages.set(definition.id, definition);
    fromPackage.set(definition.id, name);

    return definition;
  };

  entries.forEach((entry, index) => {
    const label = isRecord(entry) ? entry.provider : entry;
    const where = `Invalid end-users configuration in config/plugins.ts, ${CONFIG_KEY}[${index}] (${JSON.stringify(label)})`;

    if (typeof entry === 'string') {
      loadPackage(entry, where);

      return;
    }

    if (!isRecord(entry) || typeof entry.provider !== 'string' || !isRecord(entry.options)) {
      throw new Error(
        `${where} must be a package name, or { provider, options, enabled? } with a string provider and an options object.`
      );
    }

    const definition = builtIns.get(entry.provider) ?? loadPackage(entry.provider, where);

    if (configuredIds.has(definition.id)) {
      throw new Error(`${where}: "${definition.id}" is configured twice.`);
    }

    try {
      resolveOptions(definition, entry.options, where);
    } catch (error) {
      throw new Error(messageOf(error));
    }

    const known = new Set([
      'clientId',
      'clientSecret',
      'scopes',
      'enabled',
      'updateUserOnSignIn',
      'profileMapping',
    ]);

    Object.keys(definition.fields ?? {}).forEach((key) => known.add(key));

    const unknown = Object.keys(entry.options).filter((key) => !known.has(key));

    if (unknown.length > 0) {
      // A typo is the likely cause, but a refusal would stop an app over a spare key
      strapi.log.warn(
        `end-users: ${CONFIG_KEY}[${index}] (${JSON.stringify(entry.provider)}) in config/plugins.ts has options the provider does not use, which are ignored: ${unknown
          .map((key) => `\`${key}\``)
          .join(', ')}.`
      );
    }

    configuredIds.add(definition.id);
    configured.push({ definition, options: entry.options, enabled: entry.enabled !== false });
  });

  const available = () => [...builtIns.values(), ...packages.values()];

  return {
    available,
    fromConfig: () => [...configured],
    get: (id) => builtIns.get(id) ?? packages.get(id),
    packageOf: (id) => fromPackage.get(id) ?? null,
  };
};
