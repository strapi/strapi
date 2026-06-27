/* eslint-disable import/first */
import { fs } from 'memfs';

jest.mock('fs', () => fs);

import fse from 'fs-extra';
import type { Core } from '@strapi/types';

import localProvider from '../index';

describe('Local provider', () => {
  const strapiHost: Core.Strapi = {
    dirs: { static: { public: '' } },
  } as Core.Strapi;

  beforeAll(() => {
    fse.ensureDirSync('uploads');
  });

  describe('upload', () => {
    test('Should have relative url to file object', async () => {
      const providerInstance = localProvider({ strapi: strapiHost }).init({});

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

  describe('replace', () => {
    test('Should overwrite file at same hash and set url', async () => {
      const providerInstance = localProvider({ strapi: strapiHost }).init({});

      const oldFile = {
        name: 'replace-me',
        size: 100,
        url: '/uploads/replace_hash.json',
        hash: 'replace_hash',
        ext: '.json',
        mime: 'application/json',
      } as any;

      // Seed an existing file
      await providerInstance.upload({
        ...oldFile,
        buffer: Buffer.from('old'),
      });

      const newFile = {
        name: 'replace-me',
        size: 100,
        url: '/',
        hash: 'replace_hash',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from('new'),
      } as any;

      await providerInstance.replace(newFile, oldFile);

      expect(newFile.url).toEqual('/uploads/replace_hash.json');
      expect(fs.readFileSync('uploads/replace_hash.json').toString()).toEqual('new');
    });

    test('Should delete the old file when hash changes', async () => {
      const providerInstance = localProvider({ strapi: strapiHost }).init({});

      const oldFile = {
        name: 'old',
        size: 100,
        hash: 'old_hash_to_remove',
        ext: '.json',
        mime: 'application/json',
      } as any;

      await providerInstance.upload({
        ...oldFile,
        buffer: Buffer.from('old'),
      });

      expect(fs.existsSync('uploads/old_hash_to_remove.json')).toBe(true);

      const newFile = {
        name: 'new',
        size: 100,
        hash: 'new_hash',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from('new'),
      } as any;

      await providerInstance.replace(newFile, oldFile);

      expect(newFile.url).toEqual('/uploads/new_hash.json');
      expect(fs.existsSync('uploads/new_hash.json')).toBe(true);
      expect(fs.existsSync('uploads/old_hash_to_remove.json')).toBe(false);
    });
  });
});
