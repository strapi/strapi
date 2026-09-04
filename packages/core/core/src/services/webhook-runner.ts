/**
 * The event hub is Strapi's event control center.
 */

import createdDebugger from 'debug';
import _ from 'lodash';
import type { Logger } from '@strapi/logger';

import type { Modules } from '@strapi/types';
import WorkerQueue from './worker-queue';
import type { EventHub } from './event-hub';
import type { Fetch } from '../utils/fetch';

type Webhook = Modules.WebhookStore.Webhook;

interface Config {
  defaultHeaders: Record<string, string>;
}

interface ConstructorParameters {
  eventHub: EventHub;
  logger: Logger;
  configuration?: Record<string, unknown>;
  fetch: Fetch;
}

interface Event {
  event: string;
  info: Record<string, unknown>;
}

type Listener = (info: Record<string, unknown>) => Promise<void>;

const debug = createdDebugger('strapi:webhook');

const defaultConfiguration: Config = {
  defaultHeaders: {},
};

class WebhookRunner {
  private eventHub: EventHub;

  private logger: Logger;

  private config: Config;

  private webhooksMap: Map<string, Webhook[]> = new Map();

  private listeners: Map<string, Listener> = new Map();

  private queue: WorkerQueue<Event, void>;

  private fetch: Fetch;

  private reloadTimer?: NodeJS.Timeout;

  private reloading = false;

  constructor({ eventHub, logger, configuration = {}, fetch }: ConstructorParameters) {
    debug('Initialized webhook runner');
    this.eventHub = eventHub;
    this.logger = logger;
    this.fetch = fetch;

    if (typeof configuration !== 'object') {
      throw new Error(
        'Invalid configuration provided to the webhookRunner.\nCheck your server.json -> webhooks configuration'
      );
    }

    this.config = _.merge(defaultConfiguration, configuration);

    this.queue = new WorkerQueue({ logger, concurrency: 5 });

    this.queue.subscribe(this.executeListener.bind(this));
  }

  deleteListener(event: string) {
    debug(`Deleting listener for event '${event}'`);

    const fn = this.listeners.get(event);

    if (fn !== undefined) {
      this.eventHub.off(event, fn);
      this.listeners.delete(event);
    }
  }

  createListener(event: string) {
    debug(`Creating listener for event '${event}'`);
    if (this.listeners.has(event)) {
      this.logger.error(
        `The webhook runner is already listening for the event '${event}'. Did you mean to call .register() ?`
      );
    }

    const listen = async (info: Event['info']) => {
      this.queue.enqueue({ event, info });
    };

    this.listeners.set(event, listen);
    this.eventHub.on(event, listen);
  }

  async executeListener({ event, info }: Event) {
    debug(`Executing webhook for event '${event}'`);
    const webhooks = this.webhooksMap.get(event) || [];
    const activeWebhooks = webhooks.filter((webhook) => webhook.isEnabled === true);

    for (const webhook of activeWebhooks) {
      await this.run(webhook, event, info).catch((error: unknown) => {
        this.logger.error('Error running webhook');
        this.logger.error(error);
      });
    }
  }

  run(webhook: Webhook, event: string, info = {}) {
    const { url, headers } = webhook;

    return this.fetch(url, {
      method: 'post',
      body: JSON.stringify({
        event,
        createdAt: new Date(),
        ...info,
      }),
      headers: {
        ...this.config.defaultHeaders,
        ...headers,
        'X-Strapi-Event': event,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })
      .then(async (res) => {
        if (res.ok) {
          return {
            statusCode: res.status,
          };
        }

        return {
          statusCode: res.status,
          message: await res.text(),
        };
      })
      .catch((err) => {
        return {
          statusCode: 500,
          message: err.message,
        };
      });
  }

  add(webhook: Webhook) {
    debug(`Registering webhook '${webhook.id}'`);
    const { events } = webhook;

    events.forEach((event) => {
      if (this.webhooksMap.has(event)) {
        this.webhooksMap.get(event)?.push(webhook);
      } else {
        this.webhooksMap.set(event, [webhook]);
        this.createListener(event);
      }
    });
  }

  update(webhook: Webhook) {
    debug(`Refreshing webhook '${webhook.id}'`);
    this.remove(webhook);
    this.add(webhook);
  }

  /**
   * Produce a stable fingerprint of a set of webhooks that captures every field
   * that affects delivery (url, headers, events, enabled state). Two sets with
   * the same fingerprint are equivalent for the runner, so a reload can be
   * skipped. Field/collection ordering is normalised so that a reordering alone
   * never counts as a change; if a fingerprint ever differs spuriously the only
   * cost is a redundant (idempotent) reload, never a missed update.
   */
  private fingerprintWebhooks(webhooks: Webhook[]): string {
    return JSON.stringify(
      webhooks
        .map((webhook) => ({
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          headers: webhook.headers,
          events: [...webhook.events].sort(),
          isEnabled: webhook.isEnabled,
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    );
  }

  /**
   * Fingerprint of the webhooks currently held in memory. The same webhook can
   * live under several event keys, so it is de-duplicated by id first.
   */
  private fingerprintRegistry(): string {
    const unique = new Map<Webhook['id'], Webhook>();
    for (const webhooks of this.webhooksMap.values()) {
      for (const webhook of webhooks) {
        unique.set(webhook.id, webhook);
      }
    }
    return this.fingerprintWebhooks([...unique.values()]);
  }

  /**
   * Replace the whole in-memory registry with a fresh set of webhooks.
   *
   * The registry is otherwise only mutated locally (via add/update/remove)
   * by the instance that handled the admin request. In a clustered or
   * horizontally-scaled deployment every other instance keeps a stale copy
   * until it restarts. Reloading from the persisted webhooks lets any
   * instance converge on the current configuration. See issue #22595.
   */
  reload(webhooks: Webhook[]) {
    // Skip when the persisted set already matches memory — the common case for
    // default-on polling, so a quiet cluster does no listener churn each tick.
    if (this.fingerprintWebhooks(webhooks) === this.fingerprintRegistry()) {
      debug('Skipping webhook registry reload (unchanged)');
      return;
    }

    debug(`Reloading webhook registry with ${webhooks.length} webhook(s)`);

    // Build the next registry, then swap it in. Listeners are keyed per event
    // type and the map is read at execute time, so we only touch listeners for
    // event types that appear or disappear — existing ones stay registered.
    const nextMap = new Map<string, Webhook[]>();
    for (const webhook of webhooks) {
      for (const event of webhook.events) {
        const existing = nextMap.get(event);
        if (existing) {
          existing.push(webhook);
        } else {
          nextMap.set(event, [webhook]);
        }
      }
    }

    for (const event of nextMap.keys()) {
      if (!this.webhooksMap.has(event)) {
        this.createListener(event);
      }
    }
    for (const event of this.webhooksMap.keys()) {
      if (!nextMap.has(event)) {
        this.deleteListener(event);
      }
    }

    this.webhooksMap = nextMap;
  }

  /**
   * Periodically reconcile the in-memory registry with the persisted webhooks
   * by calling `reload()` on an interval. This lets every instance of a
   * clustered deployment converge on the current configuration (issue #22595).
   *
   * `load` is invoked on each tick to fetch the latest webhooks. Any previous
   * polling is stopped first, and the timer is `unref()`-ed so it never keeps
   * the process alive on its own.
   */
  startReloadPolling(interval: number, load: () => Promise<Webhook[]>) {
    this.stopReloadPolling();

    this.reloadTimer = setInterval(async () => {
      // `setInterval` does not await the async callback, so a slow load could
      // overlap with the next tick. Guard against it so an older result can
      // never be applied over a newer one.
      if (this.reloading) {
        return;
      }

      this.reloading = true;
      try {
        const webhooks = await load();
        this.reload(webhooks);
      } catch (error) {
        this.logger.error('Failed to reload the webhook registry from the database');
        this.logger.error(error);
      } finally {
        this.reloading = false;
      }
    }, interval);

    // Do not keep the process alive just for this timer.
    this.reloadTimer.unref?.();
  }

  stopReloadPolling() {
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = undefined;
    }
  }

  destroy() {
    this.stopReloadPolling();
  }

  remove(webhook: Webhook) {
    debug(`Unregistering webhook '${webhook.id}'`);

    this.webhooksMap.forEach((webhooks, event) => {
      const filteredWebhooks = webhooks.filter((value) => value.id !== webhook.id);

      // Cleanup hanging listeners
      if (filteredWebhooks.length === 0) {
        this.webhooksMap.delete(event);
        this.deleteListener(event);
      } else {
        this.webhooksMap.set(event, filteredWebhooks);
      }
    });
  }
}

/**
 * Expose a factory function instead of the class
 */
export default function createWebhookRunner(opts: ConstructorParameters): WebhookRunner {
  return new WebhookRunner(opts);
}

export type { WebhookRunner };
