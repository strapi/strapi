'use strict';

jest.mock('fs', () => {
  return {
    writeFile: jest.fn((_path, _buffer, callback) => callback()),
  };
});

jest.mock('fs-extra', () => {
  return {
    pathExistsSync: jest.fn(() => true),
  };
});

const localProvider = require('../index');

describe('Local provider', () => {
  beforeAll(() => {
    globalThis.strapi = globalThis.strapi ?? {};
    globalThis.strapi.dirs = { static: { public: '' } };
  });

  afterAll(() => {
    globalThis.strapi.dirs = undefined;
  });

  describe('upload', () => {
    test('Should have relative url to file object', async () => {
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
  });
});
