import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';
import { readCompatConfig } from '../compat/config';
import type { AuthEngine } from '../engine/types';
import { toContentTypes } from '../engine/better-auth/schema/to-content-types';

/** `end-users` and `two-factor` are `EndUsersTwoFactor`: the global id Strapi gives a plugin type. */
const globalIdOf = (singularName: string) =>
  [PLUGIN_ID, singularName]
    .join('-')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

/**
 * Registers the content types the engine's tables become: `user`, `session`, `account`,
 * `verification`, `two-factor`, `rate-limit`, and whatever the project's Better Auth plugins add.
 *
 * They are made when the plugin registers rather than read from a `schema.json`, because which
 * tables exist depends on the Better Auth plugins that are installed. The plugin loader finishes a
 * type it reads from a file by setting `plugin` and `globalId`; a type registered later has to be
 * finished the same way.
 *
 * Returns the singular names it registered (`user`, `session`, `two-factor`, ...), which are the
 * engine's configuration made visible: what else needs to know which types exist (hiding them from
 * GraphQL) reads them from here.
 */
/**
 * What i18n adds to every content type in its own `register`, which runs before this plugin's, so
 * the types generated here missed it: `locale` (the Document Service selects it on every relation
 * it publishes, so publishing an entry related to a user failed with "no such column: locale") and
 * the virtual `localizations`. The generated types are not localized, so both are private, as i18n
 * makes them on a type that isn't. Nothing is added without i18n.
 */
const addLocaleAttributes = (
  strapi: Core.Strapi,
  uid: string,
  schema: { collectionName?: string; attributes: Record<string, unknown> }
) => {
  if (!strapi.plugin('i18n')) {
    return;
  }

  schema.attributes.locale ??= {
    writable: true,
    private: true,
    configurable: false,
    visible: false,
    type: 'string',
  };

  if (schema.attributes.localizations !== undefined || !schema.collectionName) {
    return;
  }

  schema.attributes.localizations = {
    type: 'relation',
    relation: 'oneToMany',
    target: uid,
    writable: false,
    private: true,
    configurable: false,
    visible: false,
    unstable_virtual: true,
    joinColumn: {
      name: 'document_id',
      referencedColumn: 'document_id',
      referencedTable: strapi.db.metadata.identifiers.getTableName(schema.collectionName),
      // The population must not include the results already loaded
      on({ results }: { results: Array<{ id: unknown }> }) {
        return { id: { $notIn: results.map((result) => result.id) } };
      },
    },
  };
};

export const registerGeneratedContentTypes = (
  strapi: Core.Strapi,
  engine: AuthEngine
): string[] => {
  const contentTypes = toContentTypes(
    engine.schema(),
    strapi.db.metadata,
    readCompatConfig(strapi).usersPermissions
  );

  for (const [singularName, { schema }] of Object.entries(contentTypes)) {
    Object.assign(schema, { plugin: PLUGIN_ID, globalId: globalIdOf(singularName) });
    addLocaleAttributes(
      strapi,
      `plugin::${PLUGIN_ID}.${singularName}`,
      schema as unknown as { collectionName?: string; attributes: Record<string, unknown> }
    );
  }

  strapi.get('content-types').add(`plugin::${PLUGIN_ID}`, contentTypes);

  return Object.keys(contentTypes);
};
