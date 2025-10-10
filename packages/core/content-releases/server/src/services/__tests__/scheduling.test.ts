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
  });
});
