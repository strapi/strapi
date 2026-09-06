import type { Context } from 'koa';

import adminSettingsController from '../admin-settings';
import { getService } from '../../utils';

jest.mock('../../utils');

const mockGetService = getService as jest.MockedFunction<typeof getService>;

const STORED_SETTINGS = {
  sizeOptimization: true,
  responsiveDimensions: true,
  autoOrientation: false,
  aiMetadata: true,
};

const buildContext = (): Partial<Context> => ({
  state: {
    userAbility: {
      cannot: jest.fn().mockReturnValue(false),
    },
  },
  forbidden: jest.fn(),
});

describe('Admin Settings Controller - getSettings concurrentUploadRequests echo', () => {
  let configuredConcurrency: number | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    configuredConcurrency = undefined;

    mockGetService.mockReturnValue({
      getSettings: jest.fn().mockResolvedValue(STORED_SETTINGS),
    } as never);

    global.strapi = {
      config: {
        get: jest.fn(() => ({ concurrentUploadRequests: configuredConcurrency })),
      },
    } as never;
  });

  test('echoes the configured value alongside the stored settings', async () => {
    configuredConcurrency = 5;
    const ctx = buildContext();

    await adminSettingsController.getSettings(ctx as Context);

    expect(ctx.body).toEqual({
      data: { ...STORED_SETTINGS, concurrentUploadRequests: 5 },
    });
  });

  test('defaults to 1 (sequential) when the config does not set it', async () => {
    const ctx = buildContext();

    await adminSettingsController.getSettings(ctx as Context);

    expect(ctx.body).toEqual({
      data: { ...STORED_SETTINGS, concurrentUploadRequests: 1 },
    });
  });
});
