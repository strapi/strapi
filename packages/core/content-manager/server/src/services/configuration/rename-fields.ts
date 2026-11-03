import { isEqual } from 'lodash';
import type { Core, Struct } from '@strapi/types';

import {
  rewriteContentManagerConfiguration,
  type StoredConfiguration,
} from '../utils/configuration/attribute-renames';

type AttributeRenameHandler = Parameters<
  Core.Strapi['db']['schema']['registerAttributeRenameHandler']
>[0];

type AttributeRenames = Parameters<AttributeRenameHandler>[1];

const configurationKey = (prefix: 'content_types' | 'components', uid: string) =>
  `configuration_${prefix}::${uid}`;

const isStoredConfiguration = (value: unknown): value is StoredConfiguration => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

/**
 * Carries attribute renames into the Content Manager configuration and records
 * the old-to-new map for browsers that saved a column list under the old name.
 *
 * The list view stores its selected columns in localStorage. The server cannot
 * edit that. The map is returned with the configuration, and the list view
 * applies it before dropping a name the schema no longer has.
 */
const createContentManagerConfigurationRenamer = ({
  strapi,
}: {
  strapi: Core.Strapi;
}): AttributeRenameHandler => {
  return async (trx, renames: AttributeRenames) => {
    if (Object.keys(renames).length === 0) {
      return;
    }

    // Fresh database: the table is created by schema sync after the migrations.
    if (!(await strapi.db.getSchemaConnection(trx).hasTable('strapi_core_store_settings'))) {
      return;
    }

    const store = strapi.store({ type: 'plugin', name: 'content_manager' });
    const models: Array<{
      uid: string;
      prefix: 'content_types' | 'components';
      attributes?: Struct.SchemaAttributes;
    }> = [
      ...Object.entries(strapi.contentTypes).map(([uid, schema]) => ({
        uid,
        prefix: 'content_types' as const,
        attributes: schema.attributes,
      })),
      ...Object.entries(strapi.components).map(([uid, schema]) => ({
        uid,
        prefix: 'components' as const,
        attributes: schema.attributes,
      })),
    ];

    for (const model of models) {
      const key = configurationKey(model.prefix, model.uid);
      const current = await store.get({ key });
      const stored = isStoredConfiguration(current) ? current : null;
      const next = rewriteContentManagerConfiguration(stored, {
        attributes: model.attributes as Record<string, { type?: string; target?: string }>,
        ownRenames: renames[model.uid],
        allRenames: renames,
      });

      if (next && !next.uid) {
        next.uid = model.uid;
      }

      if (!next || isEqual(next, current)) {
        continue;
      }

      await store.set({ key, value: next });
    }
  };
};

export { createContentManagerConfigurationRenamer };
