import { setImmediate } from 'node:timers/promises';

import { bootstrap } from '../bootstrap';
import { OVERDUE_SWEEP_CRON_RULE } from '../constants';

describe('content-releases bootstrap: overdue releases', () => {
  const calls: string[] = [];
  const freezeOverdueReleases = jest.fn(async () => {
    calls.push('freeze');
  });
  const syncFromDatabase = jest.fn(async () => {
    calls.push('sync');
  });
  const cronAdd = jest.fn();
  const logError = jest.fn();

  const setupStrapi = () =>
    ({
      ee: { features: { isEnabled: () => true } },
      contentTypes: {},
      db: { lifecycles: { subscribe: jest.fn() } },
      documents: { use: jest.fn() },
      cron: { add: cronAdd },
      plugins: {
        'content-releases': {
          services: { scheduling: { freezeOverdueReleases, syncFromDatabase } },
        },
      },
      get: jest.fn(() => ({ addAllowedEvent: jest.fn() })),
      has: jest.fn(() => false),
      log: { error: logError },
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
  });

  it('freezes overdue releases before arming the scheduled jobs, then every minute', async () => {
    global.strapi = setupStrapi();

    await bootstrap({ strapi: global.strapi });
    await setImmediate();

    expect(calls).toEqual(['freeze', 'sync']);
    expect(cronAdd).toHaveBeenCalledWith({
      'content-releases::freezeOverdueReleases': {
        task: expect.any(Function),
        options: OVERDUE_SWEEP_CRON_RULE,
      },
    });
  });

  it('still arms the jobs, and logs, when the startup sweep fails', async () => {
    global.strapi = setupStrapi();
    freezeOverdueReleases.mockRejectedValueOnce(new Error('sweep failed'));

    await bootstrap({ strapi: global.strapi });
    await setImmediate();

    expect(syncFromDatabase).toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'Error while freezing overdue releases in the content-releases plugin',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
