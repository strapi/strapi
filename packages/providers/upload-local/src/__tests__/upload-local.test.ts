/* eslint-disable import/first */
import { fs } from 'memfs';

jest.mock('fs', () => fs);

import fse from 'fs-extra';

import localProvider from '../index';

describe('Local provider', () => {
  beforeAll(() => {
    global.strapi = {
      dirs: { static: { public: '' } },
    } as any;

    fse.ensureDirSync('uploads');
  });

  afterAll(() => {
    global.strapi.dirs = undefined as any;
  });

  describe('upload', () => {
    test('Should have relative url to file object', async () => {
      const providerInstance = localProvider.init({});

      const file = {
        name: 'test',
        size: 100,
        url: '/',
        path: '/tmp/',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from(''),
      } as any;

      await providerInstance.upload(file);

      expect(file.url).toBeDefined();
      expect(file.url).toEqual('/uploads/test.json');
    });
  });
});
