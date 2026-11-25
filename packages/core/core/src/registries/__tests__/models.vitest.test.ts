import { describe, expect, test, vi } from 'vitest';

import { registry as modelsRegistry } from '../models';
import { markDatabaseModelsBuilt } from '../database-models';

const createStrapi = (environment = 'development') =>
  ({
    config: { get: (key: string) => (key === 'environment' ? environment : undefined) },
    log: { warn: vi.fn() },
  }) as any;

const model = (uid: string) => ({
  uid,
  singularName: uid,
  tableName: uid.replace(/\W/g, '_'),
  attributes: {},
});

describe('Models registry', () => {
  test('adds a model before the database models are built, without a warning', () => {
    const strapi = createStrapi();
    const models = modelsRegistry(strapi);

    models.add(model('plugin::foo.job'));

    expect(models.get()).toEqual([model('plugin::foo.job')]);
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('warns once per model added after the database models are built, and still adds it', () => {
    const strapi = createStrapi();
    const models = modelsRegistry(strapi);

    markDatabaseModelsBuilt(strapi);
    models.add(model('plugin::foo.job'));
    models.add(model('plugin::foo.job'));

    expect(models.get()).toEqual([model('plugin::foo.job'), model('plugin::foo.job')]);
    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn).toHaveBeenCalledWith(
      '[strapi] Database model "plugin::foo.job" was registered after Strapi built the database models at the start of the bootstrap phase: the database does not know it, so Strapi creates no table for it and strapi.db.query("plugin::foo.job") throws "Model plugin::foo.job not found". Register it from a register function.'
    );

    models.add(model('plugin::foo.other'));

    expect(strapi.log.warn).toHaveBeenCalledTimes(2);
  });

  test('does not warn outside the development environment', () => {
    const strapi = createStrapi('production');
    const models = modelsRegistry(strapi);

    markDatabaseModelsBuilt(strapi);
    models.add(model('plugin::foo.job'));

    expect(models.get()).toEqual([model('plugin::foo.job')]);
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });
});
