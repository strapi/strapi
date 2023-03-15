'use strict';

jest.mock('fs', () => {
  return { writeFile: jest.fn((_path, _buffer, callback) => callback()) };
});

jest.mock('fs-extra', () => {
  return { pathExistsSync: jest.fn(() => true) };
});

const localProvider = require('../index');

describe('Local provider', () => {
  beforeAll(() => {
    globalThis.strapi = globalThis.strapi ?? {};
    globalThis.strapi.dirs = { static: { public: '' } };
    globalThis.strapi.config = { server: { url: 'http://localhost:1337' } };
  });

  afterAll(() => {
    globalThis.strapi.dirs = undefined;
    globalThis.strapi.config = undefined;
  });

  describe('upload', () => {
    test('Should have relative url to file object without providing useRelateiveUrl', async () => {
      const providerInstance = localProvider.init({});

      const file = {
        path: '/tmp/',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: '',
      };

      await providerInstance.upload(file);

      expect(file.url).toBeDefined();
      expect(file.url).toEqual('/uploads/test.json');
    });

    test('Should have relative url to file object with providing true useRelateiveUrl', async () => {
      const providerInstance = localProvider.init({ useRelativeUrl: true });

      const file = {
        path: '/tmp/',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: '',
      };

      await providerInstance.upload(file);

      expect(file.url).toBeDefined();
      expect(file.url).toEqual('/uploads/test.json');
    });

    test('Should have absolute url to file object with providing false useRelateiveUrl', async () => {
      const providerInstance = localProvider.init({ useRelativeUrl: false });

      const file = {
        path: '/tmp/',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: '',
      };

      await providerInstance.upload(file);

      expect(file.url).toBeDefined();
      expect(file.url).toEqual('http://localhost:1337/uploads/test.json');
    });
  });
});
