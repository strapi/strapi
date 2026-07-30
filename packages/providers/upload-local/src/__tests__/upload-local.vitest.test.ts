import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import localProvider from '../index';

describe('Local provider', () => {
  let publicDir: string;
  let uploadsDir: string;

  beforeAll(() => {
    // Use a real temp dir: under Vitest, fs-extra.pathExistsSync is bound to the
    // real fs (memfs mocks of `fs` alone do not cover it).
    publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-upload-local-'));
    uploadsDir = path.join(publicDir, 'uploads');
    fs.mkdirSync(uploadsDir);

    global.strapi = {
      dirs: { static: { public: publicDir } },
    } as any;
  });

  afterAll(() => {
    fs.rmSync(publicDir, { recursive: true, force: true });
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

  describe('replace', () => {
    test('Should overwrite file at same hash and set url', async () => {
      const providerInstance = localProvider.init({});

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
      expect(fs.readFileSync(path.join(uploadsDir, 'replace_hash.json')).toString()).toEqual('new');
    });

    test('Should delete the old file when hash changes', async () => {
      const providerInstance = localProvider.init({});

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

      expect(fs.existsSync(path.join(uploadsDir, 'old_hash_to_remove.json'))).toBe(true);

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
      expect(fs.existsSync(path.join(uploadsDir, 'new_hash.json'))).toBe(true);
      expect(fs.existsSync(path.join(uploadsDir, 'old_hash_to_remove.json'))).toBe(false);
    });
  });
});
