import * as z from 'zod/v4';
import type { Core } from '@strapi/types';

import { configSchemas, type ConfigSchemaNamespace } from './schemas';

export { configSchemas, type ConfigSchemaNamespace } from './schemas';

type ConfigParams = Core.Config.Shared.ConfigParams;

const formatConfigValidationError = (namespace: string, error: z.ZodError): Error => {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `  - ${path}: ${issue.message}`;
    })
    .join('\n');

  return new Error(`Invalid Strapi config "${namespace}":\n${details}`);
};

const parseConfigValue = <TSchema extends z.ZodType>(
  namespace: string,
  schema: TSchema,
  value: unknown
): z.infer<TSchema> => {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw formatConfigValidationError(namespace, result.error);
  }

  return result.data;
};

/**
 * Opt-in config factory: TypeScript inference today, Zod validation at load for
 * JS and TS. Validation runs when the factory is used — plain config exports
 * are unchanged (non-breaking).
 *
 * Schemas live under `configuration/schemas` and are candidates for
 * `@strapi/definitions` (`schemas.config.*`) once that package lands.
 */
export function defineConfig<
  TNamespace extends ConfigSchemaNamespace,
  TConfig extends z.input<(typeof configSchemas)[TNamespace]>,
>(
  namespace: TNamespace,
  config: TConfig | ((params: ConfigParams) => TConfig)
): TConfig | ((params: ConfigParams) => TConfig) {
  const schema = configSchemas[namespace];

  if (!schema) {
    throw new Error(
      `Unknown Strapi config namespace "${String(namespace)}". Supported: ${Object.keys(configSchemas).join(', ')}`
    );
  }

  if (typeof config === 'function') {
    const factory = config as (params: ConfigParams) => TConfig;
    return ((params: ConfigParams) => {
      return parseConfigValue(namespace, schema, factory(params)) as TConfig;
    }) as (params: ConfigParams) => TConfig;
  }

  return parseConfigValue(namespace, schema, config) as TConfig;
}

export const defineAdminConfig = <TConfig extends z.input<typeof configSchemas.admin>>(
  config: TConfig | ((params: ConfigParams) => TConfig)
) => defineConfig('admin', config);

export const defineServerConfig = <TConfig extends z.input<typeof configSchemas.server>>(
  config: TConfig | ((params: ConfigParams) => TConfig)
) => defineConfig('server', config);

export const defineApiConfig = <TConfig extends z.input<typeof configSchemas.api>>(
  config: TConfig | ((params: ConfigParams) => TConfig)
) => defineConfig('api', config);

export const defineFeaturesConfig = <TConfig extends z.input<typeof configSchemas.features>>(
  config: TConfig | ((params: ConfigParams) => TConfig)
) => defineConfig('features', config);

export const defineTypescriptConfig = <TConfig extends z.input<typeof configSchemas.typescript>>(
  config: TConfig | ((params: ConfigParams) => TConfig)
) => defineConfig('typescript', config);

export const defineDatabaseConfig = <TConfig extends z.input<typeof configSchemas.database>>(
  config: TConfig | ((params: ConfigParams) => TConfig)
) => defineConfig('database', config);

export const defineMiddlewaresConfig = <TConfig extends z.input<typeof configSchemas.middlewares>>(
  config: TConfig | ((params: ConfigParams) => TConfig)
) => defineConfig('middlewares', config);

export const definePluginsConfig = <TConfig extends z.input<typeof configSchemas.plugins>>(
  config: TConfig | ((params: ConfigParams) => TConfig)
) => defineConfig('plugins', config);
