import { join } from 'path';

jest.mock('sharp', () => {
  return {
    __esModule: true,
    default: Object.assign(jest.fn(), {
      cache: jest.fn(),
      concurrency: jest.fn(),
    }),
  };
});

jest.mock('@strapi/utils', () => ({
  errors: {
    PayloadTooLargeError: class PayloadTooLargeError extends Error {},
  },
  file: {
    bytesToHumanReadable: (value: unknown) => String(value),
    kbytesToBytes: (value: unknown) => Number(value),
  },
}));

jest.mock('../middlewares/upload', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../migrations/unsign-richtext-and-blocks-urls', () => ({
  unsignRichtextAndBlocksUrls: {},
}));

jest.mock('../mcp', () => ({
  registerUploadMcpTools: jest.fn(),
}));

const mockProviderMethods = {
  upload: jest.fn(),
  uploadStream: jest.fn(),
  replace: jest.fn(),
  replaceStream: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@strapi/provider-upload-local', () => ({
  init() {
    return mockProviderMethods;
  },
}));

/* eslint-disable import/first -- mocks run before imports */
import { register } from '../register';
/* eslint-enable import/first */

const buildStrapi = (uploadConfig: Record<string, unknown>) => {
  const strapi = {
    dirs: { app: { root: process.cwd() }, static: { public: join(process.cwd(), 'public') } },
    plugins: { upload: {} },
    db: { migrations: { providers: { internal: { register: jest.fn() } } } },
    server: { app: { on: jest.fn() }, routes: jest.fn() },
    admin: { services: { permission: { actionProvider: { registerMany: jest.fn() } } } },
    config: {
      get: jest.fn().mockReturnValue(uploadConfig),
      set: jest.fn(),
    },
    get: jest.fn().mockReturnValue({ add: jest.fn() }),
  } as any;

  strapi.plugin = (name: string) => strapi.plugins[name];

  return strapi;
};

describe('upload provider action options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('replace receives the upload action options', async () => {
    const strapi = buildStrapi({
      provider: 'local',
      actionOptions: {
        upload: { folder: 'a-folder' },
        uploadStream: { folder: 'a-folder' },
      },
    });

    await register({ strapi });

    const provider = strapi.plugins.upload.provider;
    const newFile = { hash: 'new' };
    const oldFile = { hash: 'old' };

    await provider.replace(newFile, oldFile);

    expect(mockProviderMethods.replace).toHaveBeenCalledWith(newFile, oldFile, {
      folder: 'a-folder',
    });
  });

  test('replaceStream receives the uploadStream action options', async () => {
    const strapi = buildStrapi({
      provider: 'local',
      actionOptions: {
        upload: { folder: 'a-folder' },
        uploadStream: { folder: 'a-folder' },
      },
    });

    await register({ strapi });

    const provider = strapi.plugins.upload.provider;
    const newFile = { hash: 'new' };
    const oldFile = { hash: 'old' };

    await provider.replaceStream(newFile, oldFile);

    expect(mockProviderMethods.replaceStream).toHaveBeenCalledWith(newFile, oldFile, {
      folder: 'a-folder',
    });
  });

  test('an explicit custom config wins over the action options on replace', async () => {
    const strapi = buildStrapi({
      provider: 'local',
      actionOptions: {
        upload: { folder: 'a-folder' },
      },
    });

    await register({ strapi });

    const provider = strapi.plugins.upload.provider;
    const newFile = { hash: 'new' };
    const oldFile = { hash: 'old' };

    await provider.replace(newFile, oldFile, { folder: 'custom-folder' });

    expect(mockProviderMethods.replace).toHaveBeenCalledWith(newFile, oldFile, {
      folder: 'custom-folder',
    });
  });

  test('upload still receives its own action options', async () => {
    const strapi = buildStrapi({
      provider: 'local',
      actionOptions: {
        upload: { folder: 'a-folder' },
      },
    });

    await register({ strapi });

    const provider = strapi.plugins.upload.provider;
    const file = { hash: 'new' };

    await provider.upload(file);

    expect(mockProviderMethods.upload).toHaveBeenCalledWith(file, { folder: 'a-folder' });
  });
});
