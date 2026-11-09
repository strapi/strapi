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
import {
  createCheckingDispatcher,
  createDestinationChecker,
  DestinationBlockedError,
  findDestinationBlockedError,
  parseDestinationChecks,
  type DestinationChecker,
} from './webhook-destinations';

type Webhook = Modules.WebhookStore.Webhook;
type Event = Modules.WebhookRunner.Event;

interface Config {
  defaultHeaders: Record<string, string>;
  deduplicateReleaseWebhooks: boolean;
  destinationChecks?: unknown;
}

interface ConstructorParameters {
  eventHub: EventHub;
  requestContext: Modules.RequestContext.RequestContext;
  logger: Logger;
  configuration?: Record<string, unknown>;
  fetch: Fetch;
}

type Listener = (info: Record<string, unknown>) => Promise<void>;

const debug = createdDebugger('strapi:webhook');

const defaultConfiguration: Config = {
  defaultHeaders: {},
  deduplicateReleaseWebhooks: false,
};

const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

// The most redirects followed with redirects: 'check'
const MAX_CHECKED_REDIRECTS = 5;

// The most redirects fetch follows itself, used when Strapi follows them with redirects: 'follow'
const MAX_REDIRECTS = 20;

/**
 * Whether Node's fetch sends requests through the HTTP_PROXY and HTTPS_PROXY environment variables
 */
const usesNodeEnvProxy = () => {
  const { env, execArgv } = process;
  const hasProxy = Boolean(env.HTTP_PROXY || env.http_proxy || env.HTTPS_PROXY || env.https_proxy);
  const flags = [...execArgv, ...(env.NODE_OPTIONS ?? '').split(/\s+/)];

  return hasProxy && (env.NODE_USE_ENV_PROXY === '1' || flags.includes('--use-env-proxy'));
};

// Fetch drops these when a redirect turns a request into a GET without a body
const BODY_HEADERS = [
  'content-encoding',
  'content-language',
  'content-location',
  'content-length',
  'content-type',
];

// Fetch drops these when a redirect goes to another origin
const CROSS_ORIGIN_HEADERS = ['authorization', 'proxy-authorization', 'cookie', 'host'];

/**
 * The request to send to a redirect's target, following the rules fetch uses when it follows
 * redirects itself.
 */
const getRedirectRequest = (init: RequestInit, status: number, from: URL, to: URL): RequestInit => {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();
  const becomesGet =
    ([301, 302].includes(status) && method === 'POST') ||
    (status === 303 && !['GET', 'HEAD'].includes(method));

  if (becomesGet) {
    BODY_HEADERS.forEach((name) => headers.delete(name));
  }

  if (from.origin !== to.origin) {
    CROSS_ORIGIN_HEADERS.forEach((name) => headers.delete(name));
  }

  return becomesGet
    ? { ...init, method: 'GET', body: undefined, headers }
    : { ...init, method, headers };
};

/**
 * Every event the webhook has to listen to, including the ones it only sends for some content types.
 */
const getEvents = ({ events, contentTypeEvents = {} }: Webhook) => {
  return [...new Set([...events, ...Object.values(contentTypeEvents).flat()])];
};

/**
 * A webhook is triggered by the events it listens to for every content type,
 * and by the events it listens to for the content type the event is about.
 */
const isTriggeredBy = (webhook: Webhook, event: string, info?: Event['info']) => {
  const { events, contentTypeEvents = {} } = webhook;
  const uid = info?.uid;

  if (events.includes(event)) {
    return true;
  }

  return (
    typeof uid === 'string' &&
    Object.hasOwn(contentTypeEvents, uid) &&
    contentTypeEvents[uid].includes(event)
  );
};

class WebhookRunner {
  private eventHub: EventHub;

  private requestContext: Modules.RequestContext.RequestContext;

  private logger: Logger;

  private config: Config;

  private webhooksMap: Map<string, Webhook[]> = new Map();

  private listeners: Map<string, Listener> = new Map();

  private queue: WorkerQueue<Event, void>;

  private fetch: Fetch;

  private destinationChecker: DestinationChecker;

  private checkingDispatcher?: Fetch['dispatcher'];

  constructor({
    eventHub,
    requestContext,
    logger,
    configuration = {},
    fetch,
  }: ConstructorParameters) {
    debug('Initialized webhook runner');
    this.eventHub = eventHub;
    this.requestContext = requestContext;
    this.logger = logger;
    this.fetch = fetch;

    if (typeof configuration !== 'object') {
      throw new Error(
        'Invalid configuration provided to the webhookRunner.\nCheck your server.json -> webhooks configuration'
      );
    }

    this.config = _.merge({}, defaultConfiguration, configuration);

    this.destinationChecker = createDestinationChecker(
      parseDestinationChecks(this.config.destinationChecks)
    );

    const { checks, isActive } = this.destinationChecker;

    if (!isActive && (checks.checkOnSend || checks.redirects === 'check')) {
      this.logger.warn(
        "server.webhooks.destinationChecks.checkOnSend and redirects: 'check' apply the blockLoopback, blockPrivateNetworks and blockLinkLocal options, and none of them is on, so they have no effect."
      );
    }

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
      if (this.config.deduplicateReleaseWebhooks !== true) {
        this.queue.enqueue({ event, info });
        return;
      }

      const context = this.requestContext.get();
      const releaseAction: Modules.WebhookRunner.ReleaseAction | undefined =
        context?.state?.releaseAction;
      const isReleaseAction =
        releaseAction !== undefined &&
        releaseAction.event === event &&
        releaseAction.uid === info.uid &&
        releaseAction.documentId === _.get(info, 'entry.documentId') &&
        (releaseAction.locale ?? null) === (_.get(info, 'entry.locale') ?? null);
      const releaseId: Event['releaseId'] = isReleaseAction ? context?.state?.releaseId : undefined;

      this.queue.enqueue({ event, info, releaseId });
    };

    this.listeners.set(event, listen);
    this.eventHub.on(event, listen);
  }

  async executeListener({ event, info, releaseId }: Event) {
    debug(`Executing webhook for event '${event}'`);
    const webhooks = this.webhooksMap.get(event) || [];
    const activeWebhooks = webhooks.filter(
      (webhook) =>
        webhook.isEnabled === true &&
        isTriggeredBy(webhook, event, info) &&
        !(
          this.config.deduplicateReleaseWebhooks === true &&
          releaseId !== undefined &&
          ['entry.publish', 'entry.unpublish'].includes(event) &&
          webhook.events.includes('releases.publish')
        )
    );

    for (const webhook of activeWebhooks) {
      await this.run(webhook, event, info).catch((error: unknown) => {
        this.logger.error('Error running webhook');
        this.logger.error(error);
      });
    }
  }

  /**
   * Applies the address checks turned on in `server.webhooks.destinationChecks` to a URL, before a
   * webhook is saved. Resolves to what blocks it, or to undefined when it is allowed.
   */
  checkDestination(url: string) {
    return this.destinationChecker.checkUrl(url);
  }

  /**
   * Sends one request, applying the destination checks to it when `check` is true.
   */
  private async request(url: URL | string, init: RequestInit, check: boolean) {
    if (!check || !this.destinationChecker.isActive) {
      return this.fetch(url, init);
    }

    // With a proxy, the proxy resolves the hostname and opens the connection, so the address can
    // only be checked beforehand, from here, as a best effort. The proxy is what controls where
    // requests can go in that setup.
    if (this.isProxied()) {
      const blocked = await this.destinationChecker.checkUrl(url);

      if (blocked) {
        throw new DestinationBlockedError(blocked);
      }

      return this.fetch(url, init);
    }

    this.checkingDispatcher ??= createCheckingDispatcher(this.destinationChecker);

    return this.fetch(url, { ...init, dispatcher: this.checkingDispatcher } as RequestInit);
  }

  /**
   * Whether requests go through a proxy: `server.proxy.fetch` or `server.proxy.global`, or Node's
   * own proxy support, which webhooks keep using when a check replaces the dispatcher.
   */
  private isProxied() {
    return this.fetch.dispatcher !== undefined || usesNodeEnvProxy();
  }

  /**
   * Sends a webhook request, applying `server.webhooks.destinationChecks.checkOnSend` and
   * `redirects`.
   */
  private async send(url: string, init: RequestInit) {
    const { checkOnSend, redirects } = this.destinationChecker.checks;

    // Redirects are followed here, instead of by fetch, when each target needs a check before it
    // gets the request: with redirects: 'check', and with checkOnSend behind a proxy, where the check
    // can't happen when the connection opens
    const followsRedirects =
      this.destinationChecker.isActive &&
      (redirects === 'check' || (redirects === 'follow' && checkOnSend && this.isProxied()));

    if (!followsRedirects) {
      return this.request(
        url,
        { ...init, redirect: redirects === 'none' ? 'manual' : 'follow' },
        checkOnSend
      );
    }

    const maxRedirects = redirects === 'check' ? MAX_CHECKED_REDIRECTS : MAX_REDIRECTS;
    let target = new URL(url);
    let request: RequestInit = { ...init, redirect: 'manual' };

    for (let redirectCount = 0; ; redirectCount += 1) {
      const response = await this.request(target, request, checkOnSend || redirectCount > 0);
      const location = response.headers.get('location');

      if (!REDIRECT_STATUSES.includes(response.status) || location === null) {
        return response;
      }

      await response.body?.cancel();

      if (redirectCount === maxRedirects) {
        throw new Error(`The webhook was redirected more than ${maxRedirects} times`);
      }

      const next = new URL(location, target);

      if (next.protocol !== 'http:' && next.protocol !== 'https:') {
        throw new Error("The webhook was redirected to a URL that isn't http or https");
      }

      request = getRedirectRequest(request, response.status, target, next);
      target = next;
    }
  }

  run(webhook: Webhook, event: string, info = {}) {
    const { url, headers } = webhook;

    return this.send(url, {
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
        const blocked = findDestinationBlockedError(err);

        if (blocked) {
          this.logger.warn(`Webhook "${webhook.name}" was not sent: ${blocked.message}`);
        }

        return {
          statusCode: 500,
          message: (blocked ?? err).message,
        };
      });
  }

  add(webhook: Webhook) {
    debug(`Registering webhook '${webhook.id}'`);
    getEvents(webhook).forEach((event) => {
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
