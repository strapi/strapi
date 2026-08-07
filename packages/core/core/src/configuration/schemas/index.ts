import * as z from 'zod/v4';

/**
 * User-authored config schemas (partial / passthrough).
 *
 * These validate known fields when present without requiring a fully resolved
 * config (defaults are merged later). Unknown keys pass through so this remains
 * non-breaking until stricter base-namespace validation lands.
 *
 * Intended to move to `@strapi/definitions` (`schemas.config.*`) once that
 * package exists — keep this module dependency-free aside from zod.
 */

const unknownRecord = z.record(z.string(), z.unknown());

export const adminConfigSchema = z
  .object({
    apiToken: z
      .object({
        salt: z.string().optional(),
      })
      .passthrough()
      .optional(),
    auth: z
      .object({
        secret: z.string().optional(),
        domain: z.string().optional(),
        cookie: z
          .object({
            name: z.string().optional(),
            secure: z.boolean().optional(),
            domain: z.string().optional(),
            path: z.string().optional(),
            sameSite: z
              .union([z.enum(['strict', 'lax', 'none']), z.boolean(), z.null()])
              .optional(),
          })
          .passthrough()
          .optional(),
        sessions: z
          .object({
            accessTokenLifespan: z.number().optional(),
            maxRefreshTokenLifespan: z.number().optional(),
            idleRefreshTokenLifespan: z.number().optional(),
            maxSessionLifespan: z.number().optional(),
            idleSessionLifespan: z.number().optional(),
            options: unknownRecord.optional(),
          })
          .passthrough()
          .optional(),
        events: z
          .object({
            onConnectionSuccess: z.any().optional(),
            onConnectionError: z.any().optional(),
          })
          .passthrough()
          .optional(),
        providers: z.array(unknownRecord).optional(),
        options: unknownRecord.optional(),
      })
      .passthrough()
      .optional(),
    transfer: z
      .object({
        token: z
          .object({
            salt: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    secrets: z
      .object({
        encryptionKey: z.string().optional(),
      })
      .passthrough()
      .optional(),
    auditLogs: z
      .object({
        enabled: z.boolean().optional(),
        retentionDays: z.number().optional(),
      })
      .passthrough()
      .optional(),
    history: z
      .object({
        retentionDays: z.number().optional(),
      })
      .passthrough()
      .optional(),
    preview: z
      .object({
        enabled: z.boolean().optional(),
        config: z
          .object({
            allowedOrigins: z.array(z.string()).optional(),
            handler: z.any().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    ai: z
      .object({
        enabled: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    forgotPassword: z
      .object({
        // Runtime expects a template object; keep string for transitional typing drift (#26918).
        emailTemplate: z.union([z.string(), unknownRecord]).optional(),
        from: z.string().optional(),
        replyTo: z.string().optional(),
      })
      .passthrough()
      .optional(),
    rateLimit: z
      .object({
        enabled: z.boolean().optional(),
        interval: z.number().optional(),
        max: z.number().optional(),
        delayAfter: z.number().optional(),
        timeWait: z.number().optional(),
        prefixKey: z.string().optional(),
        whitelist: z.string().optional(),
        store: z.string().optional(),
      })
      .passthrough()
      .optional(),
    flags: z
      .object({
        nps: z.boolean().optional(),
        promoteEE: z.boolean().optional(),
        docLinks: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    url: z.string().optional(),
    path: z.string().optional(),
    serveAdminPanel: z.boolean().optional(),
    autoOpen: z.boolean().optional(),
    watchIgnoreFiles: z.array(z.string()).optional(),
    host: z.string().optional(),
    port: z.number().optional(),
    layout: unknownRecord.optional(),
  })
  .passthrough();

export const serverConfigSchema = z
  .object({
    host: z.string().optional(),
    port: z.number().optional(),
    socket: z.union([z.string(), z.number()]).optional(),
    url: z.string().optional(),
    proxy: z
      .union([
        z.boolean(),
        z
          .object({
            global: z.string().optional(),
            http: z.string().optional(),
            https: z.string().optional(),
            fetch: z.string().optional(),
            koa: z.boolean().optional(),
          })
          .passthrough(),
      ])
      .optional(),
    app: z
      .object({
        keys: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    cron: z
      .object({
        enabled: z.boolean().optional(),
        tasks: unknownRecord.optional(),
      })
      .passthrough()
      .optional(),
    dirs: z
      .object({
        public: z.string().optional(),
      })
      .passthrough()
      .optional(),
    logger: z
      .object({
        config: unknownRecord.optional(),
        updates: z
          .object({
            enabled: z.boolean().optional(),
          })
          .passthrough()
          .optional(),
        startup: z
          .object({
            enabled: z.boolean().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    transfer: z
      .object({
        remote: z
          .object({
            enabled: z.boolean().optional(),
            assetIdleTimeoutMs: z.number().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    webhooks: z
      .object({
        populateRelations: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    http: unknownRecord.optional(),
    mcp: z
      .object({
        enabled: z.boolean().optional(),
        connectTimeoutMs: z.number().optional(),
        requestTimeoutMs: z.number().optional(),
      })
      .passthrough()
      .optional(),
    openapi: unknownRecord.optional(),
  })
  .passthrough();

export const apiConfigSchema = z
  .object({
    responses: z
      .object({
        privateAttributes: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    rest: z
      .object({
        prefix: z.string().optional(),
        port: z.number().optional(),
        defaultLimit: z.number().optional(),
        maxLimit: z.number().optional(),
        withCount: z.boolean().optional(),
        strictParams: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    documents: z
      .object({
        strictParams: z.boolean().optional(),
        strictRelations: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const featuresConfigSchema = z
  .object({
    future: z.record(z.string(), z.boolean().optional()).optional(),
  })
  .passthrough();

export const typescriptConfigSchema = z
  .object({
    autogenerate: z.boolean().optional(),
  })
  .passthrough();

/**
 * Database user config is client-discriminated and often includes knex extras.
 * Validate the common envelope loosely; tighten when schemas move to definitions.
 */
export const databaseConfigSchema = z
  .object({
    connection: z
      .object({
        client: z.enum(['mysql', 'postgres', 'sqlite']).optional(),
        connection: z.union([unknownRecord, z.any()]).optional(),
        debug: z.boolean().optional(),
        pool: unknownRecord.optional(),
        acquireConnectionTimeout: z.number().optional(),
        useNullAsDefault: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    settings: z
      .object({
        forceMigration: z.boolean().optional(),
        runMigrations: z.boolean().optional(),
        useTypescriptMigrations: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const configSchemas = {
  admin: adminConfigSchema,
  server: serverConfigSchema,
  api: apiConfigSchema,
  features: featuresConfigSchema,
  typescript: typescriptConfigSchema,
  database: databaseConfigSchema,
} as const;

export type ConfigSchemaNamespace = keyof typeof configSchemas;
