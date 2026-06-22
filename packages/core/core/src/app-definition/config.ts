import { yup } from '@strapi/utils';
import type { Core } from '@strapi/types';

/**
 * Database config narrowed per client so the `client` literal discriminates the
 * `connection` shape (e.g. `client: 'sqlite'` ⇒ `connection: { filename }`,
 * `client: 'postgres'` ⇒ the server connection fields). `Core.Config.Database`
 * defaults its client to the full `ClientKind` union, which would otherwise
 * force every connection to the SQL-server shape and reject SQLite.
 */
export type DatabaseConfig =
  | Core.Config.Database<'sqlite'>
  | Core.Config.Database<'mysql'>
  | Core.Config.Database<'postgres'>;

/**
 * Config that can be passed to `defineApp({ config })`.
 *
 * Mirrors the top-level config domains the legacy `config/*` directory produces
 * (`database`, `server`, `admin`, `api`, `middlewares`, …). Phase 1 validators
 * focus on the fields a no-files app actually needs (`database`, `server`); the
 * rest passes through to the existing config defaults so behavior does not drift
 * from legacy (ADR-0008).
 */
export interface AppConfig {
  database?: DatabaseConfig;
  server?: Partial<Core.Config.Server>;
  admin?: Partial<Core.Config.Admin>;
  api?: Partial<Core.Config.Api>;
  middlewares?: Core.Config.Middlewares;
  plugins?: Record<string, unknown>;
  [key: string]: unknown;
}

const databaseSchema = yup
  .object()
  .shape({
    connection: yup
      .object()
      .shape({
        client: yup
          .string()
          .oneOf(['mysql', 'postgres', 'sqlite'])
          .required('database.connection.client is required'),
        connection: yup.object().required('database.connection.connection is required'),
      })
      .required('database.connection is required'),
  })
  .required();

const serverSchema = yup.object().shape({
  host: yup.string(),
  port: yup.number(),
  app: yup.object().shape({
    keys: yup.array().of(yup.string()),
  }),
});

const throwClearError = (domain: string, error: unknown): never => {
  if (error instanceof yup.ValidationError) {
    throw new Error(`Invalid \`${domain}\` config: ${error.errors.join(', ')}`);
  }

  throw error;
};

/**
 * Typed + startup-validated database config factory.
 */
export const defineDatabaseConfig = <T extends DatabaseConfig>(config: T): T => {
  try {
    databaseSchema.validateSync(config, { strict: true, abortEarly: false });
  } catch (error) {
    return throwClearError('database', error);
  }

  return config;
};

/**
 * Typed + startup-validated server config factory.
 */
export const defineServerConfig = <T extends Partial<Core.Config.Server>>(config: T): T => {
  try {
    serverSchema.validateSync(config, { strict: false, abortEarly: false });
  } catch (error) {
    return throwClearError('server', error);
  }

  return config;
};

/**
 * Typed config builder for `defineApp({ config })`. Validates the domains a
 * no-files app needs (`database`, `server`) at startup and throws a clear error
 * on malformed config; passes everything else through untouched.
 */
export const defineConfig = <T extends AppConfig>(config: T): T => {
  if (config.database !== undefined) {
    defineDatabaseConfig(config.database);
  }

  if (config.server !== undefined) {
    defineServerConfig(config.server);
  }

  return config;
};
