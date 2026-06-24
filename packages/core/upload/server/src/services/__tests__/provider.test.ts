import { Readable } from 'stream';
import _ from 'lodash';
import createProviderService from '../provider';

const defaultConfig: Record<string, any> = {
  'plugin::upload': {
    provider: 'local',
    sizeLimit: undefined,
  },
};

function setupStrapi(providerImpl: Record<string, any>) {
  global.strapi = {
    config: {
      // eslint-disable-next-line you-dont-need-lodash-underscore/get
      get: (path: any, defaultValue: any) => _.get(defaultConfig, path, defaultValue),
    },
    plugins: {
      upload: {
        provider: providerImpl,
      },
    },
    plugin: (name: string) => (global as any).strapi.plugins[name],
  } as any;
}

function makeUploadableFile(overrides: Record<string, any> = {}) {
  const data = Buffer.from('new content');
  return {
    hash: 'new_hash',
    ext: '.png',
    mime: 'image/png',
    name: 'new.png',
    size: data.length,
    sizeInBytes: data.length,
    getStream: () => Readable.from([data]),
    ...overrides,
  } as any;
}

const oldFile = {
  id: 1,
  hash: 'old_hash',
  ext: '.png',
  mime: 'image/png',
  name: 'old.png',
  size: 10,
  url: '/uploads/old_hash.png',
};

describe('Provider service - replace', () => {
  test('uses replaceStream when provider implements it', async () => {
    const replaceStream = jest.fn().mockResolvedValue(undefined);
    const replace = jest.fn();
    const deleteFn = jest.fn();
    const uploadFn = jest.fn();
    const uploadStream = jest.fn();

    setupStrapi({
      replaceStream,
      replace,
      delete: deleteFn,
      upload: uploadFn,
      uploadStream,
    });

    const service = createProviderService({ strapi: global.strapi } as any);
    const newFile = makeUploadableFile();

    await service.replace(newFile, oldFile as any);

    expect(replaceStream).toHaveBeenCalledTimes(1);
    expect(replaceStream).toHaveBeenCalledWith(newFile, oldFile);
    expect(replace).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
    expect(uploadFn).not.toHaveBeenCalled();
    expect(uploadStream).not.toHaveBeenCalled();
    expect(newFile.stream).toBeUndefined();
  });

  test('falls back to replace (buffer) when replaceStream is not implemented', async () => {
    const replace = jest.fn().mockResolvedValue(undefined);
    const deleteFn = jest.fn();
    const uploadFn = jest.fn();

    setupStrapi({
      replace,
      delete: deleteFn,
      upload: uploadFn,
    });

    const service = createProviderService({ strapi: global.strapi } as any);
    const newFile = makeUploadableFile();

    await service.replace(newFile, oldFile as any);

    expect(replace).toHaveBeenCalledTimes(1);
    const [calledFile, calledOldFile] = replace.mock.calls[0];
    expect(calledFile).toBe(newFile);
    expect(calledOldFile).toBe(oldFile);
    expect(calledFile.buffer).toBeUndefined();
    expect(deleteFn).not.toHaveBeenCalled();
    expect(uploadFn).not.toHaveBeenCalled();
  });

  test('falls back to delete + upload when neither replace method is implemented', async () => {
    const deleteFn = jest.fn().mockResolvedValue(undefined);
    const uploadStream = jest.fn().mockResolvedValue(undefined);

    setupStrapi({
      delete: deleteFn,
      uploadStream,
    });

    const service = createProviderService({ strapi: global.strapi } as any);
    const newFile = makeUploadableFile();

    await service.replace(newFile, oldFile as any);

    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(deleteFn).toHaveBeenCalledWith(oldFile);
    expect(uploadStream).toHaveBeenCalledTimes(1);
    expect(uploadStream).toHaveBeenCalledWith(newFile);
  });

  test('fallback uses upload (buffer) when uploadStream is not implemented', async () => {
    const deleteFn = jest.fn().mockResolvedValue(undefined);
    const uploadFn = jest.fn().mockResolvedValue(undefined);

    setupStrapi({
      delete: deleteFn,
      upload: uploadFn,
    });

    const service = createProviderService({ strapi: global.strapi } as any);
    const newFile = makeUploadableFile();

    await service.replace(newFile, oldFile as any);

    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(deleteFn).toHaveBeenCalledWith(oldFile);
    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect(uploadFn).toHaveBeenCalledWith(newFile);
  });

  test('cleans up filepath on newFile after replaceStream', async () => {
    const replaceStream = jest.fn().mockResolvedValue(undefined);

    setupStrapi({
      replaceStream,
      delete: jest.fn(),
      uploadStream: jest.fn(),
    });

    const service = createProviderService({ strapi: global.strapi } as any);
    const newFile = makeUploadableFile({ filepath: '/tmp/whatever' });

    await service.replace(newFile, oldFile as any);

    expect(newFile.filepath).toBeUndefined();
  });
});
