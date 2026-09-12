import type { Core } from '@strapi/types';

import { getScope } from '../scope/context';

/** Field carrying the space on the event payload and on a webhook record. */
const SPACE_FIELD = 'space';

/**
 * Webhooks fire for content changes, and content belongs to a space — so a
 * webhook must not be told about changes in a space it has nothing to do with.
 *
 * Two halves: events are stamped with the space they happened in, and delivery
 * skips webhooks belonging to a different one. A webhook with no space is a
 * platform webhook and still hears everything, which is what an existing
 * project's webhooks keep doing after Spaces is switched on.
 */
export const registerWebhookIntegration = (strapi: Core.Strapi) => {
  stampEvents(strapi);
  filterDelivery(strapi);
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

/**
 * Drops a delivery whose webhook belongs to another space.
 *
 * The check sits on the runner's `run` rather than on its listener map, because
 * the map is keyed by event name and the same event legitimately reaches
 * webhooks in several spaces.
 */
const filterDelivery = (strapi: Core.Strapi) => {
  const runner = strapi.get('webhookRunner') as
    | {
        run: (webhook: Record<string, any>, event: string, info?: Record<string, any>) => unknown;
      }
    | undefined;

  if (!runner?.run) {
    return;
  }

  const originalRun = runner.run.bind(runner);

  runner.run = (webhook, event, info = {}) => {
    const webhookSpace = webhook?.[SPACE_FIELD];

    // A webhook that belongs to no space hears about everything.
    if (webhookSpace === null || webhookSpace === undefined) {
      return originalRun(webhook, event, info);
    }

    const eventSpace = (info as Record<string, any>)?.[SPACE_FIELD];

    // An event that carries no space happened outside one — a migration, the
    // CLI, a platform-level change — and only platform webhooks hear it.
    if (!eventSpace) {
      return undefined;
    }

    const eventSpaceId = typeof eventSpace === 'object' ? eventSpace.id : eventSpace;

    if (Number(eventSpaceId) !== Number(webhookSpace)) {
      return undefined;
    }

    return originalRun(webhook, event, info);
  };
};
