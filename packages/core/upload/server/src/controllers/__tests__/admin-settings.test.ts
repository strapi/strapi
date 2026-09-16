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

/**
 * @param deniedActions actions the caller's ability rejects, so a test can model
 * a role that holds some upload permissions but not others.
 * @param body request body, for the handlers that read one.
 */
const buildContext = (
  deniedActions: string[] = [],
  body: Record<string, unknown> = {}
): Partial<Context> => ({
  state: {
    userAbility: {
      cannot: jest.fn((action: string) => deniedActions.includes(action)),
    },
  },
  request: { body } as Context['request'],
  forbidden: jest.fn(),
});

describe('Admin Settings Controller - getSettings permission gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetService.mockReturnValue({
      getSettings: jest.fn().mockResolvedValue(STORED_SETTINGS),
    } as never);

    global.strapi = {
      config: { get: jest.fn(() => ({})) },
    } as never;
  });

  // Reads are gated by the route policy alone (`plugin::upload.read`), which the
  // API tests cover. This asserts the handler itself adds no second gate.
  test('serves a role that holds `read` but not `settings.read`', async () => {
    // The shape of the default Editor and Author roles.
    const ctx = buildContext(['plugin::upload.settings.read']);

    await adminSettingsController.getSettings(ctx as Context);

    expect(ctx.forbidden).not.toHaveBeenCalled();
    expect(ctx.body).toEqual({
      data: { ...STORED_SETTINGS, concurrentUploadRequests: 1 },
    });
  });
});

describe('Admin Settings Controller - updateSettings permission gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetService.mockReturnValue({
      setSettings: jest.fn().mockResolvedValue(undefined),
    } as never);
  });

  test('forbids a caller that holds `read` but not `settings.read`', async () => {
    // Writing stays reserved for `settings.read`: opening up the GET must not
    // let an Editor change settings for the whole project.
    const ctx = buildContext(['plugin::upload.settings.read'], STORED_SETTINGS);

    await adminSettingsController.updateSettings(ctx as Context);

    expect(ctx.forbidden).toHaveBeenCalled();
    expect(ctx.body).toBeUndefined();
  });
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
