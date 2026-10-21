import createSchedulingService from '../scheduling';
import { OVERDUE_GRACE_PERIOD_MS } from '../../constants';

const NOW = new Date('2026-10-15T09:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000);

type Row = {
  id: number;
  name: string;
  releasedAt: Date | null;
  scheduledAt: Date | null;
  status: string;
};

const setup = ({ rows, locked = rows }: { rows: Row[]; locked?: Row[] }) => {
  const findMany = jest.fn().mockResolvedValue(rows.map(({ id }) => ({ id })));
  const recordMissedRun = jest.fn(async (id: number, failureReason: string) => ({
    id,
    name: `Release ${id}`,
    status: 'failed',
    failureReason,
  }));
  const reportFailedRun = jest.fn();
  const logError = jest.fn();
  const cronRemove = jest.fn();

  type QueryBuilderMock = Record<string, jest.Mock>;

  const queryBuilder = jest.fn(() => {
    let id: number;
    const builder: QueryBuilderMock = {
      where: jest.fn((where: { id: number }) => {
        id = where.id;
        return builder;
      }),
      select: jest.fn(() => builder),
      first: jest.fn(() => builder),
      transacting: jest.fn(() => builder),
      forUpdate: jest.fn(() => builder),
      execute: jest.fn(async () => locked.find((row) => row.id === id)),
    };
    return builder;
  });

  const strapi = {
    db: {
      query: jest.fn(() => ({
        findMany,
        findOne: jest.fn(async ({ where }) => ({ id: where.id })),
      })),
      queryBuilder,
      inTransaction: jest.fn(() => false),
      transaction: jest.fn((work: (arg: { trx: object }) => unknown) => work({ trx: {} })),
    },
    plugin: jest.fn(() => ({ service: jest.fn(() => ({ recordMissedRun, reportFailedRun })) })),
    log: { error: logError },
    cron: { add: jest.fn(), remove: cronRemove },
    requestContext: { run: jest.fn((_ctx: unknown, cb: () => unknown) => cb()) },
  };

  // @ts-expect-error Ignore missing properties
  const service = createSchedulingService({ strapi });

  return { service, strapi, findMany, recordMissedRun, reportFailedRun, logError, cronRemove };
};

const release = (overrides: Partial<Row> & Pick<Row, 'id'>): Row => ({
  name: `Release ${overrides.id}`,
  releasedAt: null,
  scheduledAt: null,
  status: 'ready',
  ...overrides,
});

describe('Scheduling service: freezeOverdueReleases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('looks for planned releases overdue by more than the grace period, or that failed before the upgrade', async () => {
    const { service, findMany } = setup({ rows: [] });

    await service.freezeOverdueReleases({ now: NOW });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        releasedAt: null,
        $or: [
          { scheduledAt: { $lt: new Date(NOW.getTime() - OVERDUE_GRACE_PERIOD_MS) } },
          { status: 'failed' },
        ],
      },
      select: ['id'],
    });
  });

  it.each([
    ['not scheduled', null],
    ['scheduled in the future', new Date(NOW.getTime() + 60_000)],
    ['overdue', minutesAgo(10)],
  ])(
    'freezes a release that failed before the upgrade (%s) without reporting it again',
    async (_, scheduledAt) => {
      const { service, recordMissedRun, reportFailedRun } = setup({
        rows: [release({ id: 1, status: 'failed', scheduledAt })],
      });

      const frozen = await service.freezeOverdueReleases({ now: NOW });

      expect(frozen).toHaveLength(1);
      expect(recordMissedRun.mock.calls).toStrictEqual([[1, 'failed_before_upgrade']]);
      expect(reportFailedRun).not.toHaveBeenCalled();
    }
  );

  it('freezes a release that missed its schedule and reports it as the scheduler', async () => {
    const { service, recordMissedRun, reportFailedRun, strapi } = setup({
      rows: [release({ id: 1, scheduledAt: minutesAgo(10) })],
    });

    const frozen = await service.freezeOverdueReleases({ now: NOW });

    expect(frozen).toHaveLength(1);
    expect(recordMissedRun.mock.calls).toStrictEqual([[1, 'missed_schedule']]);
    expect(reportFailedRun).toHaveBeenCalledWith(
      { id: 1, name: 'Release 1', status: 'failed', failureReason: 'missed_schedule' },
      expect.objectContaining({ name: 'MissedSchedule' })
    );
    expect(strapi.requestContext.run).toHaveBeenCalled();
  });

  it.each([
    ['a run froze it meanwhile', { releasedAt: NOW, status: 'done' }],
    [
      'it was rescheduled to the future meanwhile',
      { scheduledAt: new Date(NOW.getTime() + 60_000) },
    ],
    ['it is overdue by less than the grace period', { scheduledAt: minutesAgo(2) }],
    ['it has no schedule', { scheduledAt: null }],
  ])('leaves a release alone when, under the lock, %s', async (_, lockedState) => {
    const row = release({ id: 1, scheduledAt: minutesAgo(10) });
    const { service, recordMissedRun, reportFailedRun } = setup({
      rows: [row],
      locked: [{ ...row, ...lockedState }],
    });

    const frozen = await service.freezeOverdueReleases({ now: NOW });

    expect(frozen).toHaveLength(0);
    expect(recordMissedRun).not.toHaveBeenCalled();
    expect(reportFailedRun).not.toHaveBeenCalled();
  });

  it('logs a release that fails to freeze and still freezes the others', async () => {
    const { service, recordMissedRun, logError } = setup({
      rows: [
        release({ id: 1, scheduledAt: minutesAgo(10) }),
        release({ id: 2, scheduledAt: minutesAgo(10) }),
      ],
    });
    recordMissedRun.mockRejectedValueOnce(new Error('write failed'));

    const frozen = await service.freezeOverdueReleases({ now: NOW });

    expect(frozen.map(({ id }) => id)).toEqual([2]);
    expect(logError).toHaveBeenCalledWith(
      "[Content Releases] Couldn't freeze overdue release 1",
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('runs one sweep at a time: a tick during a sweep joins it', async () => {
    const { service, findMany } = setup({
      rows: [release({ id: 1, scheduledAt: minutesAgo(10) })],
    });

    const [first, second] = await Promise.all([
      service.freezeOverdueReleases({ now: NOW }),
      service.freezeOverdueReleases({ now: NOW }),
    ]);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    // Once it ended, the next tick sweeps again
    await service.freezeOverdueReleases({ now: NOW });
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('refuses to run inside a transaction, which would hold every release lock until it ends', async () => {
    const { service, strapi, findMany } = setup({ rows: [] });
    strapi.db.inTransaction.mockReturnValue(true);

    await expect(service.freezeOverdueReleases({ now: NOW })).rejects.toThrow(
      'The overdue sweep must not run inside a transaction'
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it('cancels the job still armed for a release it freezes', async () => {
    const { service, cronRemove } = setup({
      rows: [release({ id: 1, scheduledAt: minutesAgo(10) })],
    });
    await service.set(1, minutesAgo(10));

    await service.freezeOverdueReleases({ now: NOW });

    expect(cronRemove).toHaveBeenCalledWith('publishRelease_1');
    expect(service.getAll().has('1')).toBe(false);
  });

  it('neither reports nor cancels a release whose freeze matched nothing (it ran meanwhile)', async () => {
    const { service, recordMissedRun, reportFailedRun, cronRemove } = setup({
      rows: [release({ id: 1, scheduledAt: minutesAgo(10) })],
    });
    await service.set(1, minutesAgo(10));
    recordMissedRun.mockResolvedValueOnce(null as never);

    const frozen = await service.freezeOverdueReleases({ now: NOW });

    expect(frozen).toHaveLength(0);
    expect(reportFailedRun).not.toHaveBeenCalled();
    expect(cronRemove).not.toHaveBeenCalled();
  });
});
