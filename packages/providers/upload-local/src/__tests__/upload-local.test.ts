/* eslint-disable import/first */
import { fs } from 'memfs';

jest.mock('fs', () => fs);

import fse from 'fs-extra';

import type { File } from '@strapi/plugin-upload';

import localProvider from '../index';

describe('Local provider', () => {
  beforeAll(() => {
    globalThis.strapi = {};
    globalThis.strapi.dirs = { static: { public: '' } };

    fse.ensureDirSync('uploads');
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
