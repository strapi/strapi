import createWebhookRunner, { type WebhookRunner } from '../webhook-runner';

type Webhook = Parameters<WebhookRunner['add']>[0];

const createRunner = () => {
  const eventHub = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  };
  const logger = { error: jest.fn() } as any;
  const fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

  const runner = createWebhookRunner({
    eventHub: eventHub as any,
    logger,
    fetch: fetch as any,
    configuration: {},
  });

  return { runner, eventHub, fetch, logger };
};

const makeWebhook = (overrides: Partial<Webhook> = {}): Webhook => ({
  id: '1',
  name: 'test',
  url: 'http://localhost/old',
  headers: {},
  events: ['entry.create'],
  isEnabled: true,
  ...overrides,
});

describe('WebhookRunner - reload', () => {
  test('reproduces #22595: without reload, a webhook updated elsewhere keeps firing to the stale url', async () => {
    const { runner, fetch } = createRunner();
    runner.add(makeWebhook({ url: 'http://localhost/old' }));

    await runner.executeListener({ event: 'entry.create', info: {} });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://localhost/old', expect.any(Object));
  });

  test('reload makes the registry converge on the persisted configuration (new url)', async () => {
    const { runner, fetch } = createRunner();
    runner.add(makeWebhook({ url: 'http://localhost/old' }));

    // Simulate the webhook being updated on another instance / in the database.
    runner.reload([makeWebhook({ url: 'http://localhost/new' })]);

    await runner.executeListener({ event: 'entry.create', info: {} });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://localhost/new', expect.any(Object));
  });

  test('reload removes webhooks that no longer exist and tears down their listeners', async () => {
    const { runner, fetch, eventHub } = createRunner();
    runner.add(makeWebhook());

    // Webhook deleted on another instance.
    runner.reload([]);

    await runner.executeListener({ event: 'entry.create', info: {} });

    expect(fetch).not.toHaveBeenCalled();
    expect(eventHub.off).toHaveBeenCalled();
  });

  test('reload registers listeners for newly added events', async () => {
    const { runner, fetch } = createRunner();
    runner.add(makeWebhook({ events: ['entry.create'] }));

    runner.reload([
      makeWebhook({ id: '2', events: ['entry.publish'], url: 'http://localhost/pub' }),
    ]);

    await runner.executeListener({ event: 'entry.publish', info: {} });

    expect(fetch).toHaveBeenCalledWith('http://localhost/pub', expect.any(Object));
  });
});

describe('WebhookRunner - reload polling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('reloads from the loader on each interval so the registry converges', async () => {
    const { runner, fetch } = createRunner();
    runner.add(makeWebhook({ url: 'http://localhost/old' }));

    const load = jest.fn().mockResolvedValue([makeWebhook({ url: 'http://localhost/new' })]);
    runner.startReloadPolling(5000, load);

    await jest.advanceTimersByTimeAsync(5000);
    expect(load).toHaveBeenCalledTimes(1);

    await runner.executeListener({ event: 'entry.create', info: {} });
    expect(fetch).toHaveBeenCalledWith('http://localhost/new', expect.any(Object));

    runner.destroy();
  });

  test('destroy stops the polling timer', async () => {
    const { runner } = createRunner();
    const load = jest.fn().mockResolvedValue([]);

    runner.startReloadPolling(5000, load);
    runner.destroy();

    await jest.advanceTimersByTimeAsync(20000);
    expect(load).not.toHaveBeenCalled();
  });

  test('starting polling again replaces the previous timer (no leak)', async () => {
    const { runner } = createRunner();
    const first = jest.fn().mockResolvedValue([]);
    const second = jest.fn().mockResolvedValue([]);

    runner.startReloadPolling(5000, first);
    runner.startReloadPolling(5000, second);

    await jest.advanceTimersByTimeAsync(5000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    runner.destroy();
  });

  test('a failing loader is logged and does not stop subsequent reloads', async () => {
    const { runner, logger } = createRunner();
    const load = jest.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue([]);

    runner.startReloadPolling(5000, load);

    await jest.advanceTimersByTimeAsync(5000);
    expect(logger.error).toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    expect(load).toHaveBeenCalledTimes(2);

    runner.destroy();
  });
});
