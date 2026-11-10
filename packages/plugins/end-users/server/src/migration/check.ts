import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import type { Core } from '@strapi/types';

import type { MigrationReport } from '../../../shared/contracts/migration';
import { readCompatConfig } from '../compat/config';
import { UP_CONFIG_MAP } from '../compat/config-map';
import { USER_UID } from '../constants';
import { BUILT_IN_PROVIDERS } from '../providers/built-in';
import { planProjectFiles } from './files/plan';
import { writeReport } from './record';
import { buildReport, nullableOnGraphql, requiredOnGraphql } from './report';
import type { ReportContext } from './report';
import { readUpSnapshot } from './snapshot';
import type { DbClient } from './snapshot';
import { isPlain } from '../utils/is-plain';
import { contentTypesOf } from '../utils/typed-strapi';

const UP_CONFIG = 'plugin::users-permissions';
const UP_USER_UID = 'plugin::users-permissions.user';

const SYSTEM_FIELDS = new Set([
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
]);

type TypeLike = {
  options?: { draftAndPublish?: boolean };
  attributes?: Record<string, { private?: boolean; required?: boolean }>;
};

/** Flat dotted keys and their values; recursion stops at a key the migration map knows */
const flatten = (config: Record<string, unknown>): Map<string, unknown> => {
  const flat = new Map<string, unknown>();

  const walk = (value: Record<string, unknown>, prefix: string) => {
    for (const [key, item] of Object.entries(value)) {
      const dotted = prefix ? `${prefix}.${key}` : key;
      const known = Object.hasOwn(UP_CONFIG_MAP, dotted) && dotted !== 'jwt';

      if (isPlain(item) && !known) {
        walk(item, dotted);
      } else if (typeof item !== 'function' && item !== undefined) {
        flat.set(dotted, item);
      }
    }
  };

  walk(config, '');

  return flat;
};

/** What Users & Permissions sets when the project sets nothing, or `null` when it can't be read */
const stockConfig = (strapi: Core.Strapi): Record<string, unknown> | null => {
  try {
    const projectRequire = createRequire(`${strapi.dirs.app.root}/package.json`);
    const server = projectRequire('@strapi/plugin-users-permissions/strapi-server');
    const defaults = (server.default ?? server).config?.default;
    const env = Object.assign((_name: string, fallback?: unknown) => fallback, {
      int: (_name: string, fallback?: number) => fallback,
      bool: (_name: string, fallback?: boolean) => fallback,
    });
    const stock = typeof defaults === 'function' ? defaults({ env }) : defaults;

    return isPlain(stock) ? stock : null;
  } catch {
    return null;
  }
};

/**
 * The keys of Users & Permissions' config the project sets: the live config's keys, less those
 * that hold the plugin's own default. Names only, never a value.
 */
const configKeys = (strapi: Core.Strapi): string[] => {
  const live = strapi.config.get<unknown>(UP_CONFIG);

  if (!isPlain(live)) {
    return [];
  }

  const stock = stockConfig(strapi);

  // Without the plugin's defaults there is no telling its own values from the project's
  if (!stock) {
    return [];
  }

  const defaults = flatten(stock);

  return [...flatten(live)]
    .filter(([key, value]) => !defaults.has(key) || !isDeepStrictEqual(defaults.get(key), value))
    .map(([key]) => key);
};

const reportContext = (
  strapi: Core.Strapi,
  client: DbClient,
  now: Date,
  codeFindings: ReportContext['codeFindings']
): ReportContext => {
  const types = contentTypesOf<Record<string, TypeLike>>(strapi);
  const compat = readCompatConfig(strapi).usersPermissions;
  const upUser = types[UP_USER_UID];
  const providers = strapi.contentAPI.permissions.providers.action;

  return {
    source: 'check',
    client,
    compat,
    now,
    permissionContext: {
      compat,
      contentTypes: Object.fromEntries(
        Object.entries(types)
          .filter(([uid]) => uid.startsWith('api::'))
          .map(([uid, type]) => [uid, { draftAndPublish: type.options?.draftAndPublish === true }])
      ),
      fields: (uid, use) =>
        Object.entries(types[uid]?.attributes ?? {})
          .filter(
            ([name, attribute]) =>
              !attribute.private && (use === 'read' || !SYSTEM_FIELDS.has(name))
          )
          .map(([name]) => name),
      isKnownAction: (action) => providers.has(action),
    },
    requiredProviderFields(id) {
      const definition = BUILT_IN_PROVIDERS.find((provider) => provider.id === id);

      return definition
        ? Object.entries(definition.fields ?? {})
            .filter(([, field]) => field.required)
            .map(([name]) => name)
        : null;
    },
    // The user's attributes become the profile's and the end user's: only a project that serves
    // GraphQL has a schema to be nullable in
    graphqlNullable:
      strapi.plugin('graphql') && upUser?.attributes
        ? nullableOnGraphql({ [USER_UID]: { attributes: upUser.attributes } })
        : [],
    // The switch makes every type's required output fields nullable, not only the user's: the
    // project's own types are the ones its clients were typed on
    graphqlRequired: strapi.plugin('graphql')
      ? requiredOnGraphql({
          ...Object.fromEntries(Object.entries(types).filter(([uid]) => uid.startsWith('api::'))),
          ...(strapi.components as unknown as Record<string, TypeLike>),
        })
      : null,
    configKeys: configKeys(strapi),
    codeFindings,
  };
};

/**
 * The check: reads the Users & Permissions tables as they are, builds the migration report from
 * them and the running application, and stores it with source `check`. It writes nothing else.
 */
export const runCheck = async (
  strapi: Core.Strapi,
  now: Date = new Date()
): Promise<MigrationReport> => {
  const client = strapi.db.dialect.client as DbClient;
  const snapshot = await readUpSnapshot(strapi.db.connection, client);
  const { findings } = await planProjectFiles(strapi);
  const report = buildReport(snapshot, reportContext(strapi, client, now, findings));

  await writeReport(strapi, report);

  return report;
};
