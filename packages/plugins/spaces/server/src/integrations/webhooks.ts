import type { Core } from '@strapi/types';

import { WEBHOOK_BINDING_UID } from '../../../shared/constants';
import { getScope, runUnscoped } from '../scope/context';

/** Field carrying the space on an event payload. */
const SPACE_FIELD = 'space';

/**
 * Webhooks fire for content changes, and content belongs to a space — so a
 * webhook must not be told about changes in a space it has nothing to do with.
 *
 * Three parts: a webhook remembers the space it was created in, the admin lists
 * only the ones belonging to the space in force, and delivery skips the rest. A
 * webhook created outside any space is a platform webhook and still hears
 * everything, which is what an existing project's webhooks keep doing after
 * Spaces is switched on.
 *
 * The binding lives in this plugin's own table because core's webhook store
 * maps rows through a fixed set of fields; a column added to its model would be
 * dropped on the way in and on the way out.
 */
export const registerWebhookIntegration = (strapi: Core.Strapi) => {
  const bindings = createBindingIndex(strapi);

  stampEvents(strapi);
  bindNewWebhooks(strapi, bindings);
  scopeTheWebhookList(strapi, bindings);
  filterDelivery(strapi, bindings);
};

/**
 * webhook id → space id, held in memory.
 *
 * Delivery happens on a queue with no request behind it and must not wait on a
 * database round trip per event, so the mapping is cached rather than read per
 * delivery. Writes on this process update it immediately; a webhook created by
 * *another* process is picked up when the cache next expires, which is what the
 * short lifetime is for — until then it would look unbound, and an unbound
 * webhook hears everything.
 */
interface BindingIndex {
  /** `undefined` means "not bound"; the boolean says whether that is certain. */
  get(webhookId: string | number): Promise<number | undefined>;
  set(webhookId: string | number, spaceId: number): void;
  remove(webhookId: string | number): void;
}

const CACHE_TTL_MS = 30_000;

const createBindingIndex = (strapi: Core.Strapi): BindingIndex => {
  let index = new Map<string, number>();
  let loadedAt = 0;
  let loading: Promise<void> | null = null;

  const load = async () => {
    const rows = await runUnscoped(() =>
      strapi.db.query(WEBHOOK_BINDING_UID).findMany({ populate: { space: true }, limit: -1 })
    );

    const next = new Map<string, number>();

    for (const row of rows as Array<{ webhookId: string; space?: { id: number } }>) {
      if (row.space?.id) {
        next.set(String(row.webhookId), row.space.id);
      }
    }

    index = next;
    loadedAt = Date.now();
  };

  const fresh = async () => {
    if (Date.now() - loadedAt < CACHE_TTL_MS) {
      return;
    }

    // One reload at a time: a burst of events must not become a burst of
    // identical queries.
    loading =
      loading ??
      load().finally(() => {
        loading = null;
      });

    await loading;
  };

  return {
    async get(webhookId) {
      await fresh();

      return index.get(String(webhookId));
    },
    set(webhookId, spaceId) {
      index.set(String(webhookId), spaceId);
    },
    remove(webhookId) {
      index.delete(String(webhookId));
    },
  };
};

/**
 * Records the space on every event as it is emitted.
 *
 * Doing it at the hub rather than at each emit site means anything listening —
 * webhooks, audit logs, a project's own subscriber — can tell which space an
 * event came from, without every emitter having to remember to say.
 */
const stampEvents = (strapi: Core.Strapi) => {
  const hub = strapi.eventHub as { emit: (event: string, ...args: unknown[]) => Promise<void> };
  const originalEmit = hub.emit.bind(hub);

  hub.emit = async (event: string, ...args: unknown[]) => {
    const scope = getScope(strapi);

    if (scope.mode !== 'space' || args.length === 0) {
      return originalEmit(event, ...args);
    }

    const [payload, ...rest] = args;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return originalEmit(event, ...args);
    }

    const stamped = { ...(payload as Record<string, unknown>) };

    if (stamped[SPACE_FIELD] === undefined) {
      stamped[SPACE_FIELD] = { id: scope.id, slug: scope.slug };
    }

    return originalEmit(event, stamped, ...rest);
  };
};

/** A webhook belongs to the space it was created in. */
const bindNewWebhooks = (strapi: Core.Strapi, bindings: BindingIndex) => {
  strapi.db.lifecycles.subscribe({
    models: ['strapi::webhook'],

    async afterCreate(event) {
      const webhook = event.result as { id: string | number } | undefined;
      const scope = getScope(strapi);

      if (!webhook?.id || scope.mode !== 'space') {
        return;
      }

      await runUnscoped(() =>
        strapi.db.query(WEBHOOK_BINDING_UID).create({
          data: { webhookId: String(webhook.id), space: scope.id },
        })
      );

      bindings.set(webhook.id, scope.id);
    },

    async afterDelete(event) {
      const webhook = event.result as { id: string | number } | undefined;

      if (!webhook?.id) {
        return;
      }

      await runUnscoped(() =>
        strapi.db
          .query(WEBHOOK_BINDING_UID)
          .deleteMany({ where: { webhookId: String(webhook.id) } })
      );

      bindings.remove(webhook.id);
    },
  });
};

/**
 * Shows a space only its own webhooks in Settings, plus the platform ones —
 * which it can see but, being unbound, are not its to reason about.
 */
const scopeTheWebhookList = (strapi: Core.Strapi, bindings: BindingIndex) => {
  const store = strapi.get('webhookStore') as
    | { findWebhooks: () => Promise<Array<{ id: string }>> }
    | undefined;

  if (!store?.findWebhooks) {
    return;
  }

  const originalFindWebhooks = store.findWebhooks.bind(store);

  store.findWebhooks = async () => {
    const webhooks = await originalFindWebhooks();
    const scope = getScope(strapi);

    if (scope.mode !== 'space') {
      return webhooks;
    }

    const owners = await Promise.all(webhooks.map((webhook) => bindings.get(webhook.id)));

    return webhooks.filter((_webhook, index) => {
      const boundTo = owners[index];

      return boundTo === undefined || boundTo === scope.id;
    });
  };
};

/**
 * Drops a delivery whose webhook belongs to another space.
 *
 * The check sits on the runner's `run` rather than on its listener map, because
 * the map is keyed by event name and one event legitimately reaches webhooks in
 * several spaces.
 */
const filterDelivery = (strapi: Core.Strapi, bindings: BindingIndex) => {
  const runner = strapi.get('webhookRunner') as
    | {
        run: (webhook: Record<string, any>, event: string, info?: Record<string, any>) => unknown;
      }
    | undefined;

  if (!runner?.run) {
    return;
  }

  const originalRun = runner.run.bind(runner);

  runner.run = async (webhook, event, info = {}) => {
    const boundTo = await bindings.get(webhook?.id);

    // An unbound webhook is a platform webhook and hears about everything.
    if (boundTo === undefined) {
      return originalRun(webhook, event, info);
    }

    const eventSpace = (info as Record<string, any>)?.[SPACE_FIELD];

    // An event with no space happened outside one — a migration, the CLI, a
    // platform-level change — and only platform webhooks hear it.
    if (!eventSpace) {
      return undefined;
    }

    const eventSpaceId = typeof eventSpace === 'object' ? eventSpace.id : eventSpace;

    if (Number(eventSpaceId) !== boundTo) {
      return undefined;
    }

    return originalRun(webhook, event, info);
  };
};
