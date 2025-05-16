import wrapWithRateLimiter from '../rate-limiter';

describe('Telemetry daily RateLimiter', () => {
  const originalDateNow = Date.now;

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test('Passes event and payload to sender', async () => {
    const sender = jest.fn(() => Promise.resolve(true));

    const send = wrapWithRateLimiter(sender, { limitedEvents: ['testEvent'] });

    const payload = { key: 'value' };
    await send('notRestricted', payload as any);

    expect(sender).toHaveBeenCalledWith('notRestricted', payload);
  });

  test('Calls sender if event is not restricted', async () => {
    const sender = jest.fn(() => Promise.resolve(true));

    const send = wrapWithRateLimiter(sender, { limitedEvents: ['testEvent'] });

    await send('notRestricted');

    expect(sender).toHaveBeenCalledWith('notRestricted');
  });

  test('Calls the sender as many times as request when events is not restricted', async () => {
    const sender = jest.fn(() => Promise.resolve(true));

    const send = wrapWithRateLimiter(sender, { limitedEvents: ['testEvent'] });

    await send('notRestricted');
    await send('notRestricted');
    await send('notRestricted');

    expect(sender).toHaveBeenCalledTimes(3);
  });

  test('Calls the sender only once when event is restricted', async () => {
    const sender = jest.fn(() => Promise.resolve(true));

    const send = wrapWithRateLimiter(sender, { limitedEvents: ['restrictedEvent'] });

    await send('restrictedEvent');
    await send('restrictedEvent');
    await send('restrictedEvent');

    expect(sender).toHaveBeenCalledTimes(1);
  });

  test('Calls the sender again after 24 hours for restricted events', async () => {
    const sender = jest.fn(() => Promise.resolve(true));

    Date.now = () => new Date('2021-01-01T00:00:00Z').getTime();

    const send = wrapWithRateLimiter(sender, { limitedEvents: ['restrictedEvent'] });

    await send('restrictedEvent');
    await send('restrictedEvent');
    await send('restrictedEvent');

    expect(sender).toHaveBeenCalledTimes(1);

    Date.now = () => new Date('2021-01-02T00:01:00Z').getTime(); // 1 day and 1 minute later.

    await send('restrictedEvent');
    await send('restrictedEvent');
    await send('restrictedEvent');

    expect(sender).toHaveBeenCalledTimes(2);
  });
});
