import createSchedulingService from '../scheduling';

describe('scheduling - timezone handling', () => {
  test('schedules a release in Europe/Amsterdam as the correct UTC instant', async () => {
    const release = {
      id: 123,
      scheduledAt: '2025-11-02 10:00:00',
      timezone: 'UTC+01:00&Europe/Amsterdam',
      releasedAt: null,
    } as any;

    // Mock strapi surface used by the scheduling service
    const cronAdd = jest.fn();
    const cronRemove = jest.fn();
    const logs = { info: jest.fn(), error: jest.fn() } as any;

    const dbQuery = () => ({
      async findOne({ where }: any) {
        if (where && where.id === release.id) return release;
        return null;
      },
    });

    const strapi: any = {
      db: {
        query() {
          return dbQuery();
        },
      },
      cron: { add: cronAdd, remove: cronRemove },
      log: logs,
    };

    const service = createSchedulingService({ strapi });

    await service.set(release.id, release.scheduledAt);

    expect(cronAdd).toHaveBeenCalled();

    const callArg = cronAdd.mock.calls[0][0];
    const job = Object.values(callArg)[0] as any;

    expect(job).toBeDefined();
    expect(job.options).toBeInstanceOf(Date);

    // Europe/Amsterdam on 2025-11-02 is CET (UTC+1), so 10:00 local -> 09:00:00Z UTC
    expect(job.options.toISOString()).toBe('2025-11-02T09:00:00.000Z');
  });
});
