import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import contentTypesRegistry from '../content-types';
import { markDatabaseModelsBuilt } from '../database-models';

const createStrapi = (environment = 'development') =>
  ({
    config: { get: (key: string) => (key === 'environment' ? environment : undefined) },
    log: { warn: vi.fn() },
  }) as any;

const definition = (singularName: string) =>
  ({
    schema: {
      kind: 'collectionType',
      collectionName: `${singularName}s`,
      info: { singularName, pluralName: `${singularName}s`, displayName: singularName },
      attributes: { title: { type: 'string' } },
    },
    actions: {},
    lifecycles: {},
  }) as any;

const addTag = (schema: any) => {
  schema.attributes.tag = { type: 'string' };
  return schema;
};

const lateAddWarning = (uid: string) =>
  `[strapi] Content type "${uid}" was registered after Strapi built the database models at the start of the bootstrap phase: the registry lists it, but the database does not know it, so Strapi creates no table for it and its queries throw "Model ${uid} not found". Register it from a register function.`;

const lateExtendWarning = (uid: string) =>
  `[strapi] Change to content type "${uid}" was registered after Strapi built the database models at the start of the bootstrap phase: the registry has the changed schema, but the database keeps the previous one, so Strapi creates no column for a new attribute and queries that use it fail. Register it from a register function.`;

describe('Content types registry', () => {
  beforeEach(() => {
    // createContentType reads the global app for the experimental firstPublishedAt flag
    vi.stubGlobal('strapi', createStrapi());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('before the database models are built', () => {
    test('adds and extends content types without a warning', () => {
      const strapi = createStrapi();
      const contentTypes = contentTypesRegistry(strapi);

      contentTypes.add('api::article', { article: definition('article') });
      contentTypes.extend('api::article.article', addTag);

      expect(contentTypes.keys()).toEqual(['api::article.article']);
      expect(contentTypes.get('api::article.article').attributes.tag).toEqual({ type: 'string' });
      expect(strapi.log.warn).not.toHaveBeenCalled();
    });
  });

  describe('after the database models are built', () => {
    test('warns once per content type added, and still adds it', () => {
      const strapi = createStrapi();
      const contentTypes = contentTypesRegistry(strapi);

      markDatabaseModelsBuilt(strapi);
      contentTypes.add('api::article', { article: definition('article') });

      expect(contentTypes.keys()).toEqual(['api::article.article']);
      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).toHaveBeenCalledWith(lateAddWarning('api::article.article'));

      contentTypes.add('api::tag', { tag: definition('tag') });

      expect(strapi.log.warn).toHaveBeenCalledTimes(2);
      expect(strapi.log.warn).toHaveBeenLastCalledWith(lateAddWarning('api::tag.tag'));
    });

    test('keeps throwing on a content type registered twice', () => {
      const strapi = createStrapi();
      const contentTypes = contentTypesRegistry(strapi);

      contentTypes.add('api::article', { article: definition('article') });
      markDatabaseModelsBuilt(strapi);

      expect(() => contentTypes.add('api::article', { article: definition('article') })).toThrow(
        'Content-type api::article.article has already been registered.'
      );
      expect(strapi.log.warn).not.toHaveBeenCalled();
    });

    test('warns once per content type extended, and still extends it', () => {
      const strapi = createStrapi();
      const contentTypes = contentTypesRegistry(strapi);

      contentTypes.add('api::article', { article: definition('article') });
      markDatabaseModelsBuilt(strapi);
      contentTypes.extend('api::article.article', addTag);
      contentTypes.extend('api::article.article', addTag);

      expect(contentTypes.get('api::article.article').attributes.tag).toEqual({ type: 'string' });
      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).toHaveBeenCalledWith(lateExtendWarning('api::article.article'));
    });

    test('keeps throwing on an unknown content type extended', () => {
      const strapi = createStrapi();
      const contentTypes = contentTypesRegistry(strapi);

      markDatabaseModelsBuilt(strapi);

      expect(() => contentTypes.extend('api::missing.missing', addTag)).toThrow(
        "Content-Type api::missing.missing doesn't exist"
      );
      expect(strapi.log.warn).not.toHaveBeenCalled();
    });

    test('does not warn outside the development environment', () => {
      const strapi = createStrapi('production');
      const contentTypes = contentTypesRegistry(strapi);

      markDatabaseModelsBuilt(strapi);
      contentTypes.add('api::article', { article: definition('article') });
      contentTypes.extend('api::article.article', addTag);

      expect(contentTypes.get('api::article.article').attributes.tag).toEqual({ type: 'string' });
      expect(strapi.log.warn).not.toHaveBeenCalled();
    });
  });
});
