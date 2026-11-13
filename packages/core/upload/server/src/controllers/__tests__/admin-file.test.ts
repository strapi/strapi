import type { Context } from 'koa';

import adminFileController from '../admin-file';
import { getService } from '../../utils';

import type {
  AIMetadataJob,
  GetLatestAIMetadataJob,
} from '../../../../shared/contracts/ai-metadata-jobs';
import type {
  CreateAIMetadataJob,
  GetAIMetadataPendingCount,
} from '../../../../shared/contracts/files';

jest.mock('../../utils');

const mockGetService = getService as jest.MockedFunction<typeof getService>;

describe('Admin File Controller - generateAIMetadata', () => {
  let ctx: Partial<Context>;
  let pm: { isAllowed: boolean };
  let mockAiMetadataService: any;

  const call = () => adminFileController.generateAIMetadata(ctx as Context);

  beforeEach(() => {
    jest.clearAllMocks();

    mockAiMetadataService = {
      isEnabled: jest.fn().mockResolvedValue(true),
      generateForFiles: jest.fn().mockResolvedValue([]),
    };

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'aiMetadata') return mockAiMetadataService;
      return {};
    });

    pm = { isAllowed: true };

    global.strapi = {
      service: jest.fn().mockReturnValue({
        createPermissionsManager: jest.fn().mockReturnValue(pm),
      }),
      admin: {
        services: {
          permission: {
            createPermissionsManager: jest.fn().mockReturnValue(pm),
          },
        },
      },
      log: { error: jest.fn(), warn: jest.fn() },
    } as any;

    ctx = {
      state: { userAbility: {}, user: { id: 1 } },
      request: { body: { fileIds: [1, 2] } } as any,
      forbidden: jest.fn(),
      badRequest: jest.fn(),
    } as any;
  });

  it('forbids the request when the user cannot update assets', async () => {
    pm.isAllowed = false;

    await call();

    expect(ctx.forbidden).toHaveBeenCalled();
    expect(mockAiMetadataService.generateForFiles).not.toHaveBeenCalled();
  });

  it('rejects a body without fileIds', async () => {
    ctx.request!.body = {};

    await expect(call()).rejects.toThrow();
    expect(mockAiMetadataService.generateForFiles).not.toHaveBeenCalled();
  });

  it('rejects an empty fileIds array', async () => {
    ctx.request!.body = { fileIds: [] };

    await expect(call()).rejects.toThrow();
    expect(mockAiMetadataService.generateForFiles).not.toHaveBeenCalled();
  });

  it('returns a bad request when the AI metadata service is disabled', async () => {
    mockAiMetadataService.isEnabled.mockResolvedValue(false);

    await call();

    expect(ctx.badRequest).toHaveBeenCalledWith('AI Metadata service is not enabled');
    expect(mockAiMetadataService.generateForFiles).not.toHaveBeenCalled();
  });

  it('returns the per-file results from the service', async () => {
    const results = [
      { id: 1, status: 'success' },
      { id: 2, status: 'skipped' },
    ];
    mockAiMetadataService.generateForFiles.mockResolvedValue(results);

    await call();

    expect(mockAiMetadataService.generateForFiles).toHaveBeenCalledWith([1, 2], { id: 1 });
    expect(ctx.body).toEqual({ data: results });
    expect(ctx.badRequest).not.toHaveBeenCalled();
  });
});

describe('Admin File Controller - getLatestAIMetadataJob', () => {
  let ctx: Partial<Context>;
  let mockAiMetadataService: { isEnabled: jest.Mock };
  let mockAiMetadataJobsService: {
    failInterruptedJobs: jest.Mock;
    getLatestActiveJob: jest.Mock;
  };

  const call = () => adminFileController.getLatestAIMetadataJob(ctx as Context);

  beforeEach(() => {
    jest.clearAllMocks();

    mockAiMetadataService = { isEnabled: jest.fn().mockResolvedValue(true) };
    mockAiMetadataJobsService = {
      failInterruptedJobs: jest.fn().mockResolvedValue(undefined),
      getLatestActiveJob: jest.fn().mockResolvedValue(null),
    };

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'aiMetadata') return mockAiMetadataService as any;
      if (serviceName === 'aiMetadataJobs') return mockAiMetadataJobsService as any;
      return {} as any;
    });

    ctx = { notFound: jest.fn() } as any;
  });

  it('sends the latest job as the bare response body, whatever its status', async () => {
    const job: AIMetadataJob = {
      id: 3,
      status: 'completed',
      createdAt: '2026-11-09T10:00:00.000Z',
      completedAt: '2026-11-09T10:01:00.000Z',
      heartbeatAtMs: '1793872845000',
    };
    mockAiMetadataJobsService.getLatestActiveJob.mockResolvedValue(job);

    await call();

    // Typed against the contract: fails type checking if the contract wraps the job in `{ data }`
    const expected: GetLatestAIMetadataJob.Response = job;
    expect(ctx.body).toEqual(expected);
    expect(ctx.notFound).not.toHaveBeenCalled();
  });

  it('fails the jobs whose server stopped before reading the latest one', async () => {
    // A single server that crashed mid-job never restarts its sweep: the read settles the job
    mockAiMetadataJobsService.failInterruptedJobs.mockImplementation(async () => {
      expect(mockAiMetadataJobsService.getLatestActiveJob).not.toHaveBeenCalled();
    });

    await call();

    expect(mockAiMetadataJobsService.failInterruptedJobs).toHaveBeenCalledTimes(1);
    expect(mockAiMetadataJobsService.getLatestActiveJob).toHaveBeenCalledTimes(1);
  });

  it('still sends the latest job when the sweep fails, so the settings page keeps polling', async () => {
    // A lock timeout on the sweep's UPDATE, while reads still work
    const sweepError = new Error('lock wait timeout');
    const log = { error: jest.fn() };
    global.strapi = { log } as any;
    mockAiMetadataJobsService.failInterruptedJobs.mockRejectedValue(sweepError);
    const job: AIMetadataJob = {
      id: 4,
      status: 'processing',
      createdAt: '2026-11-09T10:00:00.000Z',
      completedAt: null,
      heartbeatAtMs: '1793872845000',
    };
    mockAiMetadataJobsService.getLatestActiveJob.mockResolvedValue(job);

    await call();

    expect(ctx.body).toEqual(job);
    expect(log.error).toHaveBeenCalledWith(
      'Could not fail the interrupted AI metadata jobs before reading the latest one',
      { error: sweepError }
    );
  });

  it('returns not found when no job exists', async () => {
    await call();

    expect(ctx.notFound).toHaveBeenCalledWith('No AI metadata job found');
    expect(ctx.body).toBeUndefined();
  });

  it('returns not found when the AI metadata service is disabled', async () => {
    mockAiMetadataService.isEnabled.mockResolvedValue(false);

    await call();

    expect(ctx.notFound).toHaveBeenCalled();
    expect(mockAiMetadataJobsService.failInterruptedJobs).not.toHaveBeenCalled();
    expect(mockAiMetadataJobsService.getLatestActiveJob).not.toHaveBeenCalled();
  });
});

describe('Admin File Controller - getAIMetadataPendingCount', () => {
  let ctx: Partial<Context>;
  let mockAiMetadataService: { isEnabled: jest.Mock; countImagesWithoutMetadata: jest.Mock };

  const call = () => adminFileController.getAIMetadataPendingCount(ctx as Context);

  beforeEach(() => {
    jest.clearAllMocks();

    mockAiMetadataService = {
      isEnabled: jest.fn().mockResolvedValue(true),
      countImagesWithoutMetadata: jest
        .fn()
        .mockResolvedValue({ imagesWithoutMetadataCount: 2, totalImages: 5 }),
    };

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'aiMetadata') return mockAiMetadataService as any;
      return {} as any;
    });

    global.strapi = {
      admin: {
        services: {
          permission: {
            createPermissionsManager: jest.fn().mockReturnValue({ isAllowed: true }),
          },
        },
      },
      log: { error: jest.fn() },
    } as any;

    ctx = { state: { userAbility: {} }, forbidden: jest.fn(), badRequest: jest.fn() } as any;
  });

  it('sends the counts as the bare response body', async () => {
    await call();

    // Typed against the contract: fails type checking if the contract wraps the counts in `{ data }`
    const expected: GetAIMetadataPendingCount.Response = {
      imagesWithoutMetadataCount: 2,
      totalImages: 5,
    };
    expect(ctx.body).toEqual(expected);
    expect(ctx.badRequest).not.toHaveBeenCalled();
  });
});

describe('Admin File Controller - createAIMetadataJob', () => {
  let ctx: Partial<Context>;
  let mockAiMetadataService: {
    isEnabled: jest.Mock;
    countImagesWithoutMetadata: jest.Mock;
    processExistingFiles: jest.Mock;
  };
  let mockAiMetadataJobsService: { createJob: jest.Mock };

  const call = () => adminFileController.createAIMetadataJob(ctx as Context);

  beforeEach(() => {
    jest.clearAllMocks();

    mockAiMetadataService = {
      isEnabled: jest.fn().mockResolvedValue(true),
      countImagesWithoutMetadata: jest
        .fn()
        .mockResolvedValue({ imagesWithoutMetadataCount: 2, totalImages: 5 }),
      processExistingFiles: jest.fn().mockResolvedValue(undefined),
    };
    mockAiMetadataJobsService = { createJob: jest.fn().mockResolvedValue(7) };

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'aiMetadata') return mockAiMetadataService as any;
      if (serviceName === 'aiMetadataJobs') return mockAiMetadataJobsService as any;
      return {} as any;
    });

    global.strapi = {
      admin: {
        services: {
          permission: {
            createPermissionsManager: jest.fn().mockReturnValue({ isAllowed: true }),
          },
        },
      },
      log: { error: jest.fn() },
    } as any;

    ctx = {
      state: { userAbility: {}, user: { id: 1 } },
      forbidden: jest.fn(),
      badRequest: jest.fn(),
    } as any;
  });

  it('sends the created job as the bare response body', async () => {
    await call();

    // Typed against the contract: fails type checking if the contract wraps the job in `{ data }`
    const expected: CreateAIMetadataJob.Response = { jobId: 7, status: 'pending' };
    expect(ctx.body).toEqual(expected);
    expect(mockAiMetadataService.processExistingFiles).toHaveBeenCalledWith(7, { id: 1 });
  });

  it('sends a zero count as the bare response body when no image misses metadata', async () => {
    mockAiMetadataService.countImagesWithoutMetadata.mockResolvedValue({
      imagesWithoutMetadataCount: 0,
      totalImages: 5,
    });

    await call();

    const expected: CreateAIMetadataJob.Response = {
      count: 0,
      message: 'No images without metadata found',
    };
    expect(ctx.body).toEqual(expected);
    expect(mockAiMetadataJobsService.createJob).not.toHaveBeenCalled();
  });
});
