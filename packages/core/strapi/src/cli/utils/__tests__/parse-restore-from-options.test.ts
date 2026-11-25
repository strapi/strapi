import type { Core } from '@strapi/types';

import { parseRestoreFromOptions } from '../data-transfer';

jest.mock('@strapi/core', () => ({
  createStrapi: jest.fn(),
  compileStrapi: jest.fn(),
}));

const mockStrapi = {
  contentTypes: {
    'api::article.article': {},
    'api::category.category': {},
    'admin::user': {},
    'plugin::content-releases.release': {},
    'plugin::upload.file': {},
    'plugin::upload.folder': {},
  },
} as unknown as Core.Strapi;

describe('parseRestoreFromOptions', () => {
  test('full transfer deletes all entities before restore', () => {
    const restore = parseRestoreFromOptions({}, mockStrapi);

    expect(restore.entities?.include).toBeUndefined();
    expect(restore.configuration?.coreStore).toBe(true);
    expect(restore.configuration?.webhook).toBe(true);
    expect(restore.assets).toBe(true);
  });

  test('--only content preserves config and scopes entity deletion to content types', () => {
    const restore = parseRestoreFromOptions({ only: ['content'] }, mockStrapi);

    expect(restore.entities?.include).toEqual([
      'api::article.article',
      'api::category.category',
      'plugin::upload.file',
      'plugin::upload.folder',
    ]);
    expect(restore.configuration?.coreStore).toBe(false);
    expect(restore.configuration?.webhook).toBe(false);
    expect(restore.assets).toBe(false);
  });

  test('--exclude config preserves config and scopes entity deletion to content types', () => {
    const restore = parseRestoreFromOptions({ exclude: ['config'] }, mockStrapi);

    expect(restore.entities?.include).toEqual([
      'api::article.article',
      'api::category.category',
      'plugin::upload.file',
      'plugin::upload.folder',
    ]);
    expect(restore.configuration?.coreStore).toBe(false);
    expect(restore.configuration?.webhook).toBe(false);
    expect(restore.assets).toBe(true);
  });

  test('--only content,config still wipes all entities before restore', () => {
    const restore = parseRestoreFromOptions({ only: ['content', 'config'] }, mockStrapi);

    expect(restore.entities?.include).toBeUndefined();
    expect(restore.configuration?.coreStore).toBe(true);
    expect(restore.configuration?.webhook).toBe(true);
  });

  test('--only config does not delete entities before restore', () => {
    const restore = parseRestoreFromOptions({ only: ['config'] }, mockStrapi);

    expect(restore.entities?.include).toEqual([]);
    expect(restore.configuration?.coreStore).toBe(true);
    expect(restore.configuration?.webhook).toBe(true);
    expect(restore.assets).toBe(false);
  });

  test('--exclude-content-types preserves excluded types during restore', () => {
    const restore = parseRestoreFromOptions(
      { excludeContentTypes: ['plugin::upload.file', 'plugin::upload.folder'] },
      mockStrapi
    );

    expect(restore.entities?.exclude).toEqual(
      expect.arrayContaining(['plugin::upload.file', 'plugin::upload.folder'])
    );
  });

  test('--only-content-types scopes restore deletion to listed types', () => {
    const restore = parseRestoreFromOptions(
      {
        onlyContentTypes: ['api::article.article'],
        exclude: ['files'],
        filesAutoExcluded: true,
      },
      mockStrapi
    );

    expect(restore.entities?.include).toEqual(['api::article.article']);
    expect(restore.assets).toBe(false);
  });

  test('--only-content-types including upload types still restores assets when files stage is active', () => {
    const restore = parseRestoreFromOptions(
      {
        onlyContentTypes: ['plugin::upload.file', 'plugin::upload.folder'],
      },
      mockStrapi
    );

    expect(restore.assets).toBe(true);
  });

  test('--only-content-types with upload types does not restore assets when files stage is skipped', () => {
    const restore = parseRestoreFromOptions(
      {
        onlyContentTypes: ['plugin::upload.file', 'plugin::upload.folder'],
        exclude: ['files'],
      },
      mockStrapi
    );

    expect(restore.assets).toBe(false);
  });
});
