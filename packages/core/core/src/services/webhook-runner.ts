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
