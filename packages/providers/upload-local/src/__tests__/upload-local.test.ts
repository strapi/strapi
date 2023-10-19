import type { File } from '@strapi/plugin-upload';
import localProvider from '../index';

jest.mock('fs', () => {
  return {
    promises: {
      writeFile: jest.fn(() => Promise.resolve()),
      access: jest.fn(() => Promise.resolve()),
      unlink: jest.fn(() => Promise.resolve()),
    },
  };
});

jest.mock('fs-extra', () => {
  return {
    pathExistsSync: jest.fn(() => true),
  };
});

describe('Local provider', () => {
  beforeAll(() => {
    globalThis.strapi = {};
    globalThis.strapi.dirs = { static: { public: '' } };
  });

  afterAll(() => {
    globalThis.strapi.dirs = undefined;
  });

  describe('upload', () => {
    test('Should have relative url to file object', async () => {
      const providerInstance = localProvider.init({});

      const file: File = {
        name: 'test',
        size: 100,
        url: '/',
        path: '/tmp/',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from(''),
      };

      await providerInstance.upload(file);

      expect(file.url).toBeDefined();
      expect(file.url).toEqual('/uploads/test.json');
    });
  });
});
