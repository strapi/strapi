import { emitAudit } from '@strapi/utils';

import createUploadService from '../../upload';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

const settings = {
  sizeOptimization: true,
  responsiveDimensions: true,
  autoOrientation: false,
  aiMetadata: true,
};

const storeGet = jest.fn();
const storeSet = jest.fn();

global.strapi = {
  plugins: {
    upload: {
      services: {
        metrics: { trackUsage: jest.fn() },
      },
    },
  },
  plugin: (name: string) => global.strapi.plugins[name],
  store: () => ({ get: storeGet, set: storeSet }),
} as any;

const uploadService = createUploadService({ strapi: global.strapi } as any);

describe('setSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeGet.mockResolvedValue(settings);
  });

  test('stores the settings and emits upload-settings.update with the changed options', async () => {
    const value = { ...settings, sizeOptimization: false };

    await uploadService.setSettings(value);

    expect(storeSet).toHaveBeenCalledWith({ value });
    expect(emitAudit).toHaveBeenCalledTimes(1);
    expect(emitAudit).toHaveBeenCalledWith(expect.anything(), 'upload-settings.update', {
      changes: { sizeOptimization: { before: true, after: false } },
    });
  });

  test('does not emit when nothing changed', async () => {
    await uploadService.setSettings({ ...settings });

    expect(storeSet).toHaveBeenCalledTimes(1);
    expect(emitAudit).not.toHaveBeenCalled();
  });
});
