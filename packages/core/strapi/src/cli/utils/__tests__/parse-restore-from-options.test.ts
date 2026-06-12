import type { Core } from '@strapi/types';

import { parseRestoreFromOptions } from '../data-transfer';

const mockStrapi = {
  contentTypes: {
    'api::article.article': {},
    'api::category.category': {},
    'admin::user': {},
    'plugin::content-releases.release': {},
    'plugin::upload.file': {},
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
});
