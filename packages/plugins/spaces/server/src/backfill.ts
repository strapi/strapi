import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG } from './services/spaces';
import { getSpaceScopedContentTypes, isSharedContentType } from './services/content-types';
import { runUnscoped } from './utils/space-scope';

const STORE_KEY = 'backfill';

interface BackfillMarker {
  /** Content types whose legacy rows were attached to the default workspace. */
  stamped: string[];
}

const getStore = (strapi: Core.Strapi) => strapi.store({ type: 'plugin', name: 'spaces' });

interface SpaceColumnMeta {
  tableName: string;
  attributes?: { space?: { joinColumn?: { name?: string } } };
}

/** `UPDATE <table> SET space_id = <default> WHERE space_id IS NULL`, returns the row count. */
const attachNullRowsToDefault = async (
  strapi: Core.Strapi,
  uid: string,
  defaultSpaceId: number
): Promise<number> => {
  const meta = strapi.db.metadata.get(uid) as SpaceColumnMeta;
  const column = meta.attributes?.space?.joinColumn?.name ?? 'space_id';
  return strapi.db
    .connection(meta.tableName)
    .whereNull(column)
    .update({ [column]: defaultSpaceId });
};

/**
 * Attaches rows that predate workspaces (`space_id IS NULL`) to the default
 * workspace, once per content type.
 *
 * After this the meaning of NULL changes: a NULL row is one that was
 * deliberately **shared** with every workspace. That is why idempotency is
 * tracked in the plugin store rather than re-derived from `IS NULL` — a second
 * run would otherwise re-attach every shared row to default. Shared content
 * types are skipped: their rows must stay NULL. A content type that becomes
 * workspace-scoped later is stamped the first time it is seen.
 *
 * One indexed `UPDATE … WHERE space_id IS NULL` per table straight on the
 * connection (no per-row lifecycles, and the query builder cannot bulk-update
 * through a relation filter); the count is logged. Set
 * `plugins.spaces.config.backfill: false` to run the migration by hand instead.
 */
export const backfillLegacyRows = async (strapi: Core.Strapi): Promise<void> => {
  if (strapi.plugin('spaces')?.config?.('backfill') === false) {
    return;
  }

  const defaultSpace = await strapi.db
    .query('plugin::spaces.space')
    .findOne({ where: { slug: DEFAULT_SPACE_SLUG }, select: ['id'] });
  if (!defaultSpace) {
    strapi.log.warn('[spaces] No default workspace found; skipping the legacy rows backfill.');
    return;
  }

  const store = getStore(strapi);
  const marker = ((await store.get({ key: STORE_KEY })) as BackfillMarker | null) ?? {
    stamped: [],
  };
  const stamped = new Set(marker.stamped);

  for (const contentType of getSpaceScopedContentTypes(strapi)) {
    const { uid } = contentType;
    if (stamped.has(uid) || isSharedContentType(contentType)) {
      continue;
    }

    const count = await runUnscoped(() => attachNullRowsToDefault(strapi, uid, defaultSpace.id));

    if (count > 0) {
      strapi.log.info(
        `[spaces] Attached ${count} legacy ${uid} row${count === 1 ? '' : 's'} to the default workspace.`
      );
    }

    stamped.add(uid);
    // Persist after every table so a crash mid-way never repeats a finished one.
    await store.set({ key: STORE_KEY, value: { stamped: [...stamped] } });
  }
};

/**
 * Keeps the plugin's own tables through a temporary uninstall (the service is
 * EE-only, and schema sync never drops tables without `forceMigration` anyway).
 */
export const persistPluginTables = async (strapi: Core.Strapi): Promise<void> => {
  const persist = strapi.service('admin::persist-tables') as
    | { persistTables?: (tables: Array<string | { name: string }>) => Promise<void> }
    | undefined;
  if (!persist?.persistTables) {
    return;
  }

  const tables = new Set<string>(['spaces']);
  for (const uid of Object.keys(strapi.contentTypes)) {
    const meta = strapi.db.metadata.get(uid) as
      | { attributes?: Record<string, { target?: string; joinTable?: { name?: string } }> }
      | undefined;
    const joinTable = meta?.attributes?.spaces?.joinTable?.name;
    if (meta?.attributes?.spaces?.target === 'plugin::spaces.space' && joinTable) {
      tables.add(joinTable);
    }
  }

  await persist.persistTables([...tables]);
};
