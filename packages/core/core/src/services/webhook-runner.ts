/**
 * The event hub is Strapi's event control center.
 */

import { createHmac } from 'crypto';
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

  /**
   * Build the signature headers for a delivery.
   *
   * When the webhook has a `secret`, the raw request body is signed with
   * HMAC-SHA256 and returned as `X-Strapi-Signature-256: sha256=<hex>`
   * (GitHub-style, algorithm-prefixed so the scheme can evolve later without a
   * breaking change). The receiver recomputes the HMAC over the raw body it
   * receives and compares it to the header to verify authenticity.
   *
   * Returns an empty object when no secret is configured, so unsigned webhooks
   * keep their exact previous behaviour.
   */
  getSignatureHeaders(body: string, secret?: string): Record<string, string> {
    if (!secret) {
      return {};
    }

    const signature = createHmac('sha256', secret).update(body, 'utf8').digest('hex');

    return {
      'X-Strapi-Signature-256': `sha256=${signature}`,
    };
  }

  run(webhook: Webhook, event: string, info = {}) {
    const { url, headers, secret } = webhook;

    // Serialize the body once so the exact bytes that are signed are the exact
    // bytes that are sent. Re-serializing after signing could produce a payload
    // whose signature no longer matches.
    const body = JSON.stringify({
      event,
      createdAt: new Date(),
      ...info,
    });

    return this.fetch(url, {
      method: 'post',
      body,
      headers: {
        ...this.config.defaultHeaders,
        ...headers,
        // Signature and Strapi-owned headers are merged last so a user-defined
        // custom header can never override or spoof them.
        ...this.getSignatureHeaders(body, secret),
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
