import type { ParameterizedContext } from 'koa';
import { createLogger } from '@strapi/logger';
import type { Modules } from '@strapi/types';

import createEventHub from '../event-hub';
import requestContext from '../request-context';
import createWebhookRunner from '../webhook-runner';

const createWebhook = (events: string[]): Modules.WebhookStore.Webhook => ({
  id: 'build',
  name: 'Trigger build',
  url: 'https://example.com/build',
  headers: {},
  events,
  isEnabled: true,
});

describe('Webhook runner', () => {
  let eventHub: ReturnType<typeof createEventHub>;
  let runner: ReturnType<typeof createWebhookRunner>;
  let mockFetch: jest.MockedFunction<Modules.Fetch.Fetch>;

  beforeEach(() => {
    eventHub = createEventHub();
    mockFetch = jest.fn().mockResolvedValue(new Response(null, { status: 200 }));
    runner = createWebhookRunner({
      eventHub,
      requestContext,
      logger: createLogger({ silent: true }),
      fetch: mockFetch,
    });
  });

  it.each(['entry.create', 'entry.update', 'entry.delete', 'entry.publish', 'entry.unpublish'])(
    'delivers standalone %s to a webhook subscribed to releases',
    async (event) => {
      runner.add(createWebhook([event, 'releases.publish']));

      await runner.executeListener({ event, info: { entry: { id: 1 } } });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/build',
        expect.objectContaining({ headers: expect.objectContaining({ 'X-Strapi-Event': event }) })
      );
    }
  );

  it.each(['entry.publish', 'entry.unpublish'])(
    'skips release %s for a webhook subscribed to releases',
    async (event) => {
      runner.add(createWebhook([event, 'releases.publish']));

      await runner.executeListener({ event, info: { entry: { id: 1 } }, releaseId: 1 });

      expect(mockFetch).not.toHaveBeenCalled();
    }
  );

  it.each(['entry.publish', 'entry.unpublish'])(
    'delivers release %s to an entry-only webhook without exposing the release context',
    async (event) => {
      runner.add(createWebhook([event, 'releases.publish']));
      runner.add({
        ...createWebhook([event]),
        id: 'entries',
        url: 'https://example.com/entries',
      });

      await runner.executeListener({ event, info: { entry: { id: 1 } }, releaseId: 1 });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/entries', expect.any(Object));
      expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
        event,
        createdAt: expect.any(String),
        entry: { id: 1 },
      });
    }
  );

  it.each([
    'entry.create',
    'entry.update',
    'entry.delete',
    'media.create',
    'media.update',
    'media.delete',
  ])('delivers %s during a release', async (event) => {
    runner.add(createWebhook([event, 'releases.publish']));

    await runner.executeListener({ event, info: { entry: { id: 1 } }, releaseId: 1 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/build',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Strapi-Event': event }) })
    );
  });

  it.each([true, false])('delivers releases.publish with isPublished=%s', async (isPublished) => {
    runner.add(createWebhook(['entry.publish', 'entry.unpublish', 'releases.publish']));

    await runner.executeListener({
      event: 'releases.publish',
      info: { isPublished, release: { id: 1 } },
      releaseId: 1,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
      event: 'releases.publish',
      createdAt: expect.any(String),
      isPublished,
      release: { id: 1 },
    });
  });

  it('skips disabled webhooks', async () => {
    runner.add({ ...createWebhook(['entry.publish']), isEnabled: false });

    await runner.executeListener({ event: 'entry.publish', info: { entry: { id: 1 } } });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each(['entry.publish', 'entry.unpublish'])(
    'preserves internal subscribers when release %s webhooks are skipped',
    async (event) => {
      runner.add(createWebhook([event, 'releases.publish']));

      const subscriber = jest.fn();
      eventHub.subscribe(subscriber);

      await requestContext.run({ state: { releaseId: 1 } } as ParameterizedContext, async () => {
        await eventHub.emit(event, { entry: { id: 1 } });
      });

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(event, { entry: { id: 1 } });
      expect(mockFetch).not.toHaveBeenCalled();
    }
  );

  it.each(['entry.publish', 'entry.unpublish'])(
    'retains the release context for %s waiting in the queue',
    async (event) => {
      runner.add(createWebhook([event, 'releases.publish']));

      let finishRequests: (() => void) | undefined;
      const pendingRequests = new Promise<void>((resolve) => {
        finishRequests = resolve;
      });

      mockFetch.mockImplementation(async () => {
        await pendingRequests;

        return new Response(null, { status: 200 });
      });

      for (const id of [1, 2, 3, 4, 5]) {
        await eventHub.emit(event, { entry: { id } });
      }

      expect(mockFetch).toHaveBeenCalledTimes(5);

      await requestContext.run({ state: { releaseId: 1 } } as ParameterizedContext, async () => {
        await eventHub.emit(event, { entry: { id: 6 } });
      });

      expect(requestContext.get()).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(5);

      if (!finishRequests) {
        throw new Error('Expected the pending requests to have a resolver');
      }

      finishRequests();

      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });

      expect(mockFetch).toHaveBeenCalledTimes(5);

      for (const id of [1, 2, 3, 4, 5]) {
        expect(JSON.parse(String(mockFetch.mock.calls[id - 1][1]?.body))).toEqual({
          event,
          createdAt: expect.any(String),
          entry: { id },
        });
      }
    }
  );
});
