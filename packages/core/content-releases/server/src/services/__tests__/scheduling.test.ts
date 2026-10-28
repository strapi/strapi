import createSchedulingService from '../scheduling';

const baseStrapiMock = {
  features: {
    future: {
      isEnabled: jest.fn().mockReturnValue(true),
    },
  },
  cron: {
    add: jest.fn(),
    remove: jest.fn(),
  },
};

describe('Scheduling service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should throw an error if the release does not exist', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn(() => ({
            findOne: jest.fn().mockReturnValue(null),
          })),
        },
      };

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      expect(() => schedulingService.set('1', new Date())).rejects.toThrow(
        'No release found for id 1'
      );
    });

    it('should cancel the previous job if it exists and create the new one', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn(() => ({
            findOne: jest.fn().mockReturnValue({ id: 1 }),
          })),
        },
      };

      const oldJobDate = new Date();
      const newJobDate = new Date(oldJobDate.getTime() + 1000);

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      const scheduledJobs = await schedulingService.set('1', oldJobDate);
      expect(scheduledJobs.size).toBe(1);
      expect(strapiMock.cron.add).toHaveBeenCalledTimes(1);

      const oldTaskName = scheduledJobs.get('1')!;

      await schedulingService.set('1', newJobDate);

      expect(strapiMock.cron.remove).toHaveBeenCalledWith(oldTaskName);
      expect(strapiMock.cron.add).toHaveBeenCalledTimes(2);
      expect(strapiMock.cron.remove.mock.invocationCallOrder[0]).toBeLessThan(
        strapiMock.cron.add.mock.invocationCallOrder[1]
      );
    });

    it('should cancel the previous job when the release is created with a numeric id and updated with a string id', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn(() => ({
            findOne: jest.fn().mockReturnValue({ id: 1 }),
          })),
        },
      };

      const oldJobDate = new Date();
      const newJobDate = new Date(oldJobDate.getTime() + 1000);

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });

      // create() and syncFromDatabase() pass the numeric database row id
      const scheduledJobs = await schedulingService.set(1, oldJobDate);
      expect(scheduledJobs.size).toBe(1);
      expect(strapiMock.cron.add).toHaveBeenCalledTimes(1);

      // the update controller passes ctx.params.id, which is always a string
      await schedulingService.set('1', newJobDate);

      expect(strapiMock.cron.remove).toHaveBeenCalledWith('publishRelease_1');
      expect(strapiMock.cron.add).toHaveBeenCalledTimes(2);
      expect(strapiMock.cron.remove.mock.invocationCallOrder[0]).toBeLessThan(
        strapiMock.cron.add.mock.invocationCallOrder[1]
      );
      expect(scheduledJobs.size).toBe(1);
    });

    it('should create a new job', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn(() => ({
            findOne: jest.fn().mockReturnValue({ id: 1 }),
          })),
        },
      };

      const date = new Date();

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      const scheduledJobs = await schedulingService.set('1', date);
      expect(scheduledJobs.size).toBe(1);
      expect(strapiMock.cron.add).toHaveBeenCalledTimes(1);
    });

    it('runs the release as a scheduled publish when the job fires', async () => {
      const publish = jest.fn().mockResolvedValue({});
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn(() => ({
            findOne: jest.fn().mockReturnValue({ id: 1 }),
          })),
        },
        plugin: jest.fn(() => ({ service: jest.fn(() => ({ publish })) })),
        requestContext: { run: jest.fn((_context, work) => work()) },
      };

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      await schedulingService.set('1', new Date());

      // A scheduled run that would release nothing fails instead of being rejected like a manual one
      const [[jobs]] = strapiMock.cron.add.mock.calls;
      await jobs.publishRelease_1.task();

      expect(publish).toHaveBeenCalledWith('1', { trigger: 'scheduled' });
    });
  });

  describe('cancel', () => {
    it('should cancel the job if it exists', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn(() => ({
            findOne: jest.fn().mockReturnValue({ id: 1 }),
          })),
        },
      };

      const date = new Date();

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      const scheduledJobs = await schedulingService.set('1', date);
      expect(scheduledJobs.size).toBe(1);
      expect(strapiMock.cron.add).toHaveBeenCalledTimes(1);

      const taskName = scheduledJobs.get('1')!;
      schedulingService.cancel('1');

      expect(strapiMock.cron.remove).toHaveBeenCalledWith(taskName);
      expect(scheduledJobs.size).toBe(0);
    });
  });

  describe('getAll', () => {
    it('should return all the scheduled jobs', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn(() => ({
            findOne: jest.fn().mockReturnValue({ id: 1 }),
          })),
        },
      };

      const date = new Date();

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      await schedulingService.set('1', date);
      expect(schedulingService.getAll().size).toBe(1);
    });
  });

  describe('syncFromDatabase', () => {
    it('should sync the scheduled jobs from the database', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn(() => ({
            findMany: jest
              .fn()
              .mockReturnValue([{ id: 1, scheduledAt: new Date(), releasedAt: null }]),
            findOne: jest.fn().mockReturnValue({ id: 1 }),
          })),
        },
      };

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      const scheduledJobs = await schedulingService.syncFromDatabase();
      expect(scheduledJobs.size).toBe(1);
      expect(strapiMock.cron.add).toHaveBeenCalledTimes(1);
    });

    it('does not arm a release that failed before the upgrade', async () => {
      const findMany = jest.fn().mockReturnValue([]);
      const strapiMock = {
        ...baseStrapiMock,
        db: { query: jest.fn(() => ({ findMany })) },
      };

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      await schedulingService.syncFromDatabase();

      expect(findMany).toHaveBeenCalledWith({
        where: {
          scheduledAt: { $gte: expect.any(Date) },
          releasedAt: null,
          $or: [{ status: { $ne: 'failed' } }, { status: null }],
        },
      });
    });

    it('silently skips a release deleted or frozen since the read, and arms the others', async () => {
      const logError = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        log: { error: logError },
        db: {
          query: jest.fn(() => ({
            findMany: jest.fn().mockReturnValue([
              { id: 1, scheduledAt: new Date(), releasedAt: null },
              { id: 2, scheduledAt: new Date(), releasedAt: null },
            ]),
            // Release 1 was frozen in between
            findOne: jest.fn(async ({ where }) => (where.id === 1 ? null : { id: where.id })),
          })),
        },
      };

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      const scheduledJobs = await schedulingService.syncFromDatabase();

      expect([...scheduledJobs.keys()]).toEqual(['2']);
      expect(logError).not.toHaveBeenCalled();
    });

    it('logs a release that could not be armed, and still arms the others', async () => {
      const logError = jest.fn();
      const failure = new Error('cron unavailable');
      const strapiMock = {
        ...baseStrapiMock,
        cron: {
          ...baseStrapiMock.cron,
          add: jest.fn((jobs: Record<string, unknown>) => {
            if ('publishRelease_1' in jobs) {
              throw failure;
            }
          }),
        },
        log: { error: logError },
        db: {
          query: jest.fn(() => ({
            findMany: jest.fn().mockReturnValue([
              { id: 1, scheduledAt: new Date(), releasedAt: null },
              { id: 2, scheduledAt: new Date(), releasedAt: null },
            ]),
            findOne: jest.fn(async ({ where }) => ({ id: where.id })),
          })),
        },
      };

      // @ts-expect-error Ignore missing properties
      const schedulingService = createSchedulingService({ strapi: strapiMock });
      const scheduledJobs = await schedulingService.syncFromDatabase();

      expect([...scheduledJobs.keys()]).toEqual(['2']);
      expect(logError).toHaveBeenCalledWith("[Content Releases] Couldn't schedule release 1", {
        error: failure,
      });
    });
  });
});
