import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG } from './services/spaces';
import { lookupEntrySpaceId } from './utils/entry-space';
import { getRequestSpace, resolveReadTarget } from './utils/space-scope';

export const HISTORY_VERSION_UID = 'plugin::content-manager.history-version';
export const AUDIT_LOG_UID = 'admin::audit-log';
const SPACE_UID = 'plugin::spaces.space';

/** The `space` join column for a raw database model (no content-type schema). */
const makeRawSpaceRelation = () => ({
  type: 'relation' as const,
  relation: 'manyToOne' as const,
  target: SPACE_UID,
  useJoinTable: false,
});

interface RawModel {
  uid: string;
  attributes: Record<string, unknown>;
}

interface ModelsRegistry {
  add(model: RawModel): unknown;
  get(): RawModel[];
}

/**
 * Register phase: content history versions record the workspace of the entry
 * they belong to. The history version is a raw database model (registered
 * through `strapi.get('models')` by the Content Manager), so it is patched in
 * place — or on arrival when the Content Manager registers after this plugin.
 */
export const patchHistoryVersionModel = (strapi: Core.Strapi): void => {
  const registry = strapi.get('models') as ModelsRegistry;
  const patch = (model: RawModel) => {
    if (model.uid === HISTORY_VERSION_UID && !model.attributes.space) {
      model.attributes.space = makeRawSpaceRelation();
    }
  };

  registry.get().forEach(patch);

  const originalAdd = registry.add.bind(registry);
  registry.add = (model: RawModel) => {
    patch(model);
    return originalAdd(model);
  };
};

/** Register phase: audit logs record the workspace the action was performed in. */
export const patchAuditLogContentType = (strapi: Core.Strapi): void => {
  const contentType = strapi.contentTypes[AUDIT_LOG_UID as keyof typeof strapi.contentTypes];
  if (contentType && !contentType.attributes.space) {
    (contentType.attributes as Record<string, unknown>).space = {
      ...makeRawSpaceRelation(),
      writable: true,
      private: true,
      configurable: false,
      visible: false,
    };
  }
};

interface ReadEvent {
  params?: { where?: unknown } & Record<string, unknown>;
}

/** Sub-workspace audit logs: the workspace's own rows only (instance-level events stay in default). */
export const applyAuditLogFilter = (strapi: Core.Strapi, rawEvent: unknown): void => {
  const target = resolveReadTarget(strapi);
  if (target === 'all') {
    return;
  }
  const event = rawEvent as ReadEvent;
  event.params = event.params ?? {};
  const condition = { space: { id: target } };
  event.params.where = event.params.where ? { $and: [event.params.where, condition] } : condition;
};

/** Own-or-shared, like the entries the versions describe. */
export const applyHistoryFilter = (strapi: Core.Strapi, rawEvent: unknown): void => {
  const target = resolveReadTarget(strapi);
  if (target === 'all') {
    return;
  }
  const event = rawEvent as ReadEvent;
  event.params = event.params ?? {};
  const condition = { $or: [{ space: { id: target } }, { space: { id: { $null: true } } }] };
  event.params.where = event.params.where ? { $and: [event.params.where, condition] } : condition;
};

/**
 * Bootstrap phase: stamps and read nets for both models, and the audit logs
 * service populates `space` so the admin can show and filter it.
 */
export const patchHistoryAndAuditLogsForSpaces = (strapi: Core.Strapi): void => {
  const hasModel = (uid: string) => {
    try {
      return strapi.db.metadata.has(uid);
    } catch {
      return false;
    }
  };

  if (hasModel(HISTORY_VERSION_UID)) {
    strapi.db.lifecycles.subscribe({
      models: [HISTORY_VERSION_UID],
      async beforeCreate(event: any) {
        const data = event?.params?.data;
        if (!data || data.space !== undefined) return;
        // Authoritative: the entry's workspace, even when edited from default.
        data.space = await lookupEntrySpaceId(
          strapi,
          data.contentType,
          data.relatedDocumentId,
          data.locale
        );
      },
      beforeFindOne(event: unknown) {
        applyHistoryFilter(strapi, event);
      },
      beforeFindMany(event: unknown) {
        applyHistoryFilter(strapi, event);
      },
      beforeCount(event: unknown) {
        applyHistoryFilter(strapi, event);
      },
    });
  }

  if (hasModel(AUDIT_LOG_UID)) {
    strapi.db.lifecycles.subscribe({
      models: [AUDIT_LOG_UID],
      beforeCreate(event: any) {
        const data = event?.params?.data;
        if (!data || data.space !== undefined) return;
        const request = getRequestSpace(strapi);
        // Instance-level events (login, …) and default-workspace actions stay NULL.
        data.space = request && request.slug !== DEFAULT_SPACE_SLUG ? request.id : null;
      },
      beforeFindOne(event: unknown) {
        applyAuditLogFilter(strapi, event);
      },
      beforeFindMany(event: unknown) {
        applyAuditLogFilter(strapi, event);
      },
      beforeCount(event: unknown) {
        applyAuditLogFilter(strapi, event);
      },
    });

    wrapAuditLogsService(strapi);
  }
};

const SPACE_FIELDS = ['id', 'slug', 'name', 'color'];

/**
 * The audit logs service spreads the transformed query last, so asking for
 * `populate: ['user', 'space']` overrides its fixed `['user']`; the workspace
 * is then kept on each row for the admin column and filter.
 */
const wrapAuditLogsService = (strapi: Core.Strapi): void => {
  let service: any;
  try {
    service = strapi.get('audit-logs');
  } catch {
    return;
  }
  if (!service || typeof service.findMany !== 'function') {
    return;
  }

  const originalFindMany = service.findMany.bind(service);
  service.findMany = async (query: any = {}) => {
    const result = await originalFindMany({ ...query, populate: ['user', 'space'] });
    return {
      ...result,
      results: (result?.results ?? []).map((row: any) => ({
        ...row,
        space: row.space ? pickFields(row.space) : null,
      })),
    };
  };

  if (typeof service.findOne === 'function') {
    const originalFindOne = service.findOne.bind(service);
    service.findOne = async (id: unknown) => {
      const result = await originalFindOne(id);
      if (!result || typeof result !== 'object' || result.space === undefined) {
        return result;
      }
      return { ...result, space: result.space ? pickFields(result.space) : null };
    };
  }
};

const pickFields = (space: Record<string, unknown>) =>
  Object.fromEntries(SPACE_FIELDS.map((field) => [field, space[field] ?? null]));
