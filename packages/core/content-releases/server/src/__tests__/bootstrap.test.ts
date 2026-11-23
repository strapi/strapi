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
    // At the same instant: a release the sweep left planned is one the sync runs or arms
    const [[{ now }]] = freezeOverdueReleases.mock.calls as unknown as [[{ now: Date }]];
    expect(now).toBeInstanceOf(Date);
    expect(syncFromDatabase).toHaveBeenCalledWith({ now });
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

describe('content-releases bootstrap: afterDeleteMany subscriber', () => {
  const deletePlannedActions = jest.fn(async () => {});

  const setupSubscriber = async () => {
    const subscribe = jest.fn();
    const strapi = {
      ee: { features: { isEnabled: () => true } },
      contentTypes: { 'api::article.article': { options: { draftAndPublish: true } } },
      db: { lifecycles: { subscribe }, inTransaction: () => false },
      documents: { use: jest.fn() },
      cron: { add: jest.fn() },
      getModel: (uid: string) => ({
        uid,
        kind: 'collectionType',
        options: { draftAndPublish: true },
      }),
      plugins: {
        'content-releases': {
          services: {
            'release-action': { deletePlannedActions },
            scheduling: {
              freezeOverdueReleases: jest.fn(async () => {}),
              syncFromDatabase: jest.fn(async () => {}),
            },
          },
        },
      },
      get: jest.fn(() => ({ addAllowedEvent: jest.fn() })),
      has: jest.fn(() => false),
      log: { error: jest.fn() },
    } as any;
    global.strapi = strapi;

    await bootstrap({ strapi });

    const [[{ afterDeleteMany }]] = subscribe.mock.calls;
    return afterDeleteMany;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters the planned actions by documentId when the where clause has one', async () => {
    const afterDeleteMany = await setupSubscriber();

    afterDeleteMany({
      model: { uid: 'api::article.article' },
      params: { where: { documentId: 'doc-1', locale: 'fr' } },
    });

    expect(deletePlannedActions).toHaveBeenCalledWith({
      contentType: 'api::article.article',
      locale: 'fr',
      entryDocumentId: 'doc-1',
    });
  });

  it.each([
    ['absent', {}],
    ['undefined', { documentId: undefined }],
    ['an empty string', { documentId: '' }],
  ])('does not filter by documentId when it is %s', async (_, where) => {
    const afterDeleteMany = await setupSubscriber();

    afterDeleteMany({ model: { uid: 'api::article.article' }, params: { where } });

    expect(deletePlannedActions).toHaveBeenCalledWith({
      contentType: 'api::article.article',
      locale: null,
    });
  });
});
