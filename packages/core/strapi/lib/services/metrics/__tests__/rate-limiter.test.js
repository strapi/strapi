'use strict';

const wrapWithRateLimiter = require('../rate-limiter');

describe('Telemetry daily RateLimiter', () => {
  test('Passes event and payload to sender', async () => {
    const sender = jest.fn(() => Promise.resolve(true));

    const send = wrapWithRateLimiter(sender, { limitedEvents: ['testEvent'] });

    const payload = { key: 'value' };
    await send('notRestricted', payload);

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
});
