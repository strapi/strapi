import {
  AUDIT_LOG_UID,
  HISTORY_VERSION_UID,
  applyAuditLogFilter,
  applyHistoryFilter,
  patchAuditLogContentType,
  patchHistoryAndAuditLogsForSpaces,
  patchHistoryVersionModel,
} from '../history-audit-integration';
import { runUnscoped } from '../utils/space-scope';

const ACME = { id: 2, slug: 'acme' };
const DEFAULT = { id: 1, slug: 'default' };

const makeStrapi = (space?: { id: number; slug: string }) =>
  ({
    requestContext: {
      get: () => (space ? { state: { spaceId: space.id, spaceSlug: space.slug } } : undefined),
    },
  }) as any;

describe('history and audit logs integration', () => {
  describe('register', () => {
    it('patches the history version model in place, or when it arrives', () => {
      const present = { uid: HISTORY_VERSION_UID, attributes: {} };
      const models: any[] = [present];
      const registry = { add: (model: any) => models.push(model), get: () => models };
      const strapi = { get: () => registry } as any;

      patchHistoryVersionModel(strapi);
      expect(present.attributes).toHaveProperty('space.target', 'plugin::spaces.space');

      const late = { uid: HISTORY_VERSION_UID, attributes: {} };
      registry.add(late);
      expect(late.attributes).toHaveProperty('space.relation', 'manyToOne');

      const other = { uid: 'other', attributes: {} };
      registry.add(other);
      expect(other.attributes).not.toHaveProperty('space');
    });

    it('adds a private space relation to the audit log content type', () => {
      const auditLog = { uid: AUDIT_LOG_UID, attributes: {} as Record<string, unknown> };
      const strapi = { contentTypes: { [AUDIT_LOG_UID]: auditLog } } as any;

      patchAuditLogContentType(strapi);

      expect(auditLog.attributes.space).toMatchObject({
        target: 'plugin::spaces.space',
        private: true,
      });
      expect(() => patchAuditLogContentType({ contentTypes: {} } as any)).not.toThrow();
    });
  });

  describe('read nets', () => {
    it('narrows a sub-workspace to its own audit logs, and to own-or-shared history', () => {
      const strapi = makeStrapi(ACME);
      const audit: any = { params: { where: { action: 'entry.create' } } };
      const history: any = { params: {} };

      applyAuditLogFilter(strapi, audit);
      applyHistoryFilter(strapi, history);

      expect(audit.params.where).toEqual({
        $and: [{ action: 'entry.create' }, { space: { id: 2 } }],
      });
      expect(history.params.where).toEqual({
        $or: [{ space: { id: 2 } }, { space: { id: { $null: true } } }],
      });
    });

    it('leaves default, headerless and unscoped reads alone', async () => {
      const events = [
        { strapi: makeStrapi(DEFAULT), event: { params: {} } as any },
        { strapi: makeStrapi(), event: { params: {} } as any },
      ];
      for (const { strapi, event } of events) {
        applyAuditLogFilter(strapi, event);
        applyHistoryFilter(strapi, event);
        expect(event.params.where).toBeUndefined();
      }

      const unscoped: any = { params: {} };
      await runUnscoped(() => applyAuditLogFilter(makeStrapi(ACME), unscoped));
      expect(unscoped.params.where).toBeUndefined();
    });
  });

  describe('bootstrap', () => {
    const install = (
      space?: { id: number; slug: string },
      models = [HISTORY_VERSION_UID, AUDIT_LOG_UID]
    ) => {
      const subscribers: any[] = [];
      const findMany = jest.fn(async () => ({
        results: [
          {
            id: 1,
            action: 'entry.create',
            space: { id: 2, slug: 'acme', name: 'Acme', color: null, extra: 1 },
          },
        ],
        pagination: {},
      }));
      const auditService = { findMany };
      const strapi = {
        ...makeStrapi(space),
        get: (name: string) => (name === 'audit-logs' ? auditService : undefined),
        contentTypes: { 'api::article.article': { uid: 'api::article.article' } },
        db: {
          metadata: { has: (uid: string) => models.includes(uid) },
          lifecycles: { subscribe: (subscriber: any) => subscribers.push(subscriber) },
          query: () => ({
            findMany: async () => [{ id: 9, space: { id: 3 }, spaceOverride: false }],
          }),
        },
      } as any;
      patchHistoryAndAuditLogsForSpaces(strapi);
      return { subscribers, auditService, findMany };
    };

    it('stamps history versions from their entry and audit logs from the request', async () => {
      const { subscribers } = install(ACME);
      const history = subscribers.find((s) => s.models[0] === HISTORY_VERSION_UID);
      const audit = subscribers.find((s) => s.models[0] === AUDIT_LOG_UID);

      const version: any = {
        params: {
          data: { contentType: 'api::article.article', relatedDocumentId: 'abc', locale: 'en' },
        },
      };
      await history.beforeCreate(version);
      expect(version.params.data.space).toBe(3);

      const log: any = { params: { data: { action: 'entry.create' } } };
      audit.beforeCreate(log);
      expect(log.params.data.space).toBe(2);
    });

    it('keeps default-workspace and headerless audit logs unstamped', () => {
      for (const space of [DEFAULT, undefined]) {
        const { subscribers } = install(space);
        const audit = subscribers.find((s) => s.models[0] === AUDIT_LOG_UID);
        const log: any = { params: { data: { action: 'admin.auth.success' } } };
        audit.beforeCreate(log);
        expect(log.params.data.space).toBeNull();
      }
    });

    it('populates the workspace on audit log listings', async () => {
      const { auditService, findMany } = install(ACME);

      const result = await auditService.findMany({ page: 1 });

      expect(findMany).toHaveBeenCalledWith({ page: 1, populate: ['user', 'space'] });
      expect(result.results[0].space).toEqual({ id: 2, slug: 'acme', name: 'Acme', color: null });
    });

    it('skips models that are not registered', () => {
      const { subscribers } = install(ACME, []);
      expect(subscribers).toHaveLength(0);
    });
  });
});
