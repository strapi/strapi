import type { Context } from 'koa';

import adminFileController from '../admin-file';
import { getService } from '../../utils';

jest.mock('../../utils');

const mockGetService = getService as jest.MockedFunction<typeof getService>;

describe('Admin File Controller - unstable_generateAIMetadata', () => {
  let ctx: Partial<Context>;
  let pm: { isAllowed: boolean };
  let mockAiMetadataService: any;

  const call = () => adminFileController.unstable_generateAIMetadata(ctx as Context);

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
