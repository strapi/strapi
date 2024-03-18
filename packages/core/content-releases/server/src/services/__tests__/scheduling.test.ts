import { scheduleJob } from 'node-schedule';
import createSchedulingService from '../scheduling';

const baseStrapiMock = {
  features: {
    future: {
      isEnabled: jest.fn().mockReturnValue(true),
    },
  },
};

jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn(),
}));

describe('Scheduling service', () => {
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
      const mockScheduleJob = jest.fn().mockReturnValue({ cancel: jest.fn() });
      // @ts-expect-error - scheduleJob is a mock
      scheduleJob.mockImplementation(mockScheduleJob);

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
      expect(mockScheduleJob).toHaveBeenCalledWith(oldJobDate, expect.any(Function));

      const oldJob = scheduledJobs.get('1')!;

      await schedulingService.set('1', newJobDate);

      expect(oldJob.cancel).toHaveBeenCalled();
      expect(mockScheduleJob).toHaveBeenCalledWith(newJobDate, expect.any(Function));
    });

    it('should create a new job', async () => {
      const mockScheduleJob = jest.fn().mockReturnValue({ cancel: jest.fn() });
      // @ts-expect-error - scheduleJob is a mock
      scheduleJob.mockImplementation(mockScheduleJob);

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
      expect(mockScheduleJob).toHaveBeenCalledWith(date, expect.any(Function));
    });
  });

  describe('cancel', () => {
    it('should cancel the job if it exists', async () => {
      const mockScheduleJob = jest.fn().mockReturnValue({ cancel: jest.fn() });
      // @ts-expect-error - scheduleJob is a mock
      scheduleJob.mockImplementation(mockScheduleJob);

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
      expect(mockScheduleJob).toHaveBeenCalledWith(date, expect.any(Function));

      schedulingService.cancel('1');
      expect(scheduledJobs.size).toBe(0);
    });
  });

  describe('getAll', () => {
    it('should return all the scheduled jobs', async () => {
      const mockScheduleJob = jest.fn().mockReturnValue({ cancel: jest.fn() });
      // @ts-expect-error - scheduleJob is a mock
      scheduleJob.mockImplementation(mockScheduleJob);

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
      const mockScheduleJob = jest.fn().mockReturnValue({ cancel: jest.fn() });
      // @ts-expect-error - scheduleJob is a mock
      scheduleJob.mockImplementation(mockScheduleJob);

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
      expect(mockScheduleJob).toHaveBeenCalledWith(expect.any(Date), expect.any(Function));
    });
  });
});
