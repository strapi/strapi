import { runGlobal, runInSpace, runUnscoped } from '../../scope/context';
import { registerWebhookIntegration } from '../webhooks';

interface Options {
  /** webhook id -> space id, as stored. */
  bindings?: Record<string, number>;
  webhooks?: Array<{ id: string }>;
}

const makeStrapi = ({ bindings = {}, webhooks = [] }: Options = {}) => {
  const delivered: Array<{ id: string; event: string }> = [];
  const emitted: Array<[string, unknown]> = [];
  const created: Array<Record<string, unknown>> = [];

  let subscriber: Record<string, (event: unknown) => Promise<void>> = {};

  // Declared with the signature the integration wraps it in, so the tests can
  // call it the way the event hub does.
  const runner: {
    run: (
      webhook: Record<string, any>,
      event: string,
      info?: Record<string, any>
    ) => Promise<unknown>;
  } = {
    run(webhook, event) {
      delivered.push({ id: webhook.id, event });

      return Promise.resolve('delivered');
    },
  };

  const store = {
    findWebhooks: async () => webhooks,
  };

  const strapi = {
    requestContext: { get: () => undefined },
    eventHub: {
      async emit(event: string, payload: unknown) {
        emitted.push([event, payload]);
      },
    },
    get: (name: string) =>
      ({ webhookRunner: runner, webhookStore: store })[name as 'webhookRunner' | 'webhookStore'],
    db: {
      lifecycles: {
        subscribe(next: Record<string, (event: unknown) => Promise<void>>) {
          subscriber = next;
        },
      },
      query: () => ({
        findMany: async () =>
          Object.entries(bindings).map(([webhookId, spaceId]) => ({
            webhookId,
            space: { id: spaceId },
          })),
        async create({ data }: { data: Record<string, unknown> }) {
          created.push(data);

          return data;
        },
        deleteMany: async () => ({ count: 1 }),
      }),
    },
  } as never;

  registerWebhookIntegration(strapi);

  return { strapi, runner, store, delivered, emitted, created, fire: () => subscriber };
};

describe('webhooks in a space', () => {
  describe('stamping events', () => {
    it('records the space an event happened in', async () => {
      const { strapi, emitted } = makeStrapi();

      await runInSpace({ id: 7, slug: 'fr' }, () =>
        (strapi as any).eventHub.emit('entry.create', { model: 'article' })
      );

      expect(emitted[0][1]).toMatchObject({ space: { id: 7, slug: 'fr' } });
    });

    it('leaves an event that happened outside a space unmarked', async () => {
      const { strapi, emitted } = makeStrapi();

      await runUnscoped(() => (strapi as any).eventHub.emit('entry.create', { model: 'article' }));

      expect(emitted[0][1]).not.toHaveProperty('space');
    });

    it('does not overwrite a space the emitter already named', async () => {
      const { strapi, emitted } = makeStrapi();

      await runInSpace({ id: 7, slug: 'fr' }, () =>
        (strapi as any).eventHub.emit('entry.create', { space: { id: 1, slug: 'de' } })
      );

      expect(emitted[0][1]).toMatchObject({ space: { id: 1, slug: 'de' } });
    });

    it('leaves an event with no payload alone', async () => {
      const { strapi, emitted } = makeStrapi();

      await runInSpace({ id: 7, slug: 'fr' }, () => (strapi as any).eventHub.emit('ee.enable'));

      expect(emitted[0]).toEqual(['ee.enable']);
    });
  });

  describe('delivery', () => {
    it('reaches a webhook in the space the event came from', async () => {
      const { runner, delivered } = makeStrapi({ bindings: { w1: 7 } });

      await runner.run({ id: 'w1' }, 'entry.create', { space: { id: 7 } });

      expect(delivered).toEqual([{ id: 'w1', event: 'entry.create' }]);
    });

    it('skips a webhook belonging to another space', async () => {
      const { runner, delivered } = makeStrapi({ bindings: { w1: 7 } });

      await runner.run({ id: 'w1' }, 'entry.create', { space: { id: 2 } });

      expect(delivered).toEqual([]);
    });

    it('keeps an unbound webhook hearing everything', async () => {
      // What an existing project's webhooks keep doing after Spaces is on.
      const { runner, delivered } = makeStrapi();

      await runner.run({ id: 'w1' }, 'entry.create', { space: { id: 2 } });

      expect(delivered).toHaveLength(1);
    });

    it('keeps an event with no space to platform webhooks', async () => {
      const { runner, delivered } = makeStrapi({ bindings: { w1: 7 } });

      await runner.run({ id: 'w1' }, 'entry.create', {});

      expect(delivered).toEqual([]);
    });
  });

  describe('the Settings list', () => {
    it('shows a space its own webhooks and the platform ones', async () => {
      const { store } = makeStrapi({
        bindings: { own: 7, other: 2 },
        webhooks: [{ id: 'own' }, { id: 'other' }, { id: 'platform' }],
      });

      const visible = await runInSpace({ id: 7, slug: 'fr' }, () => store.findWebhooks());

      expect(visible.map((webhook) => webhook.id)).toEqual(['own', 'platform']);
    });

    it('shows everything outside a space', async () => {
      const { store } = makeStrapi({
        bindings: { own: 7, other: 2 },
        webhooks: [{ id: 'own' }, { id: 'other' }],
      });

      const visible = await runGlobal(() => store.findWebhooks());

      expect(visible).toHaveLength(2);
    });
  });

  describe('binding a new webhook', () => {
    it('records the space it was created in', async () => {
      const { created, fire } = makeStrapi();

      await runInSpace({ id: 7, slug: 'fr' }, () =>
        fire().afterCreate({ result: { id: 'w9' } } as never)
      );

      expect(created).toEqual([{ webhookId: 'w9', space: 7 }]);
    });

    it('leaves one created outside a space unbound', async () => {
      const { created, fire } = makeStrapi();

      await runGlobal(() => fire().afterCreate({ result: { id: 'w9' } } as never));

      expect(created).toEqual([]);
    });
  });
});
