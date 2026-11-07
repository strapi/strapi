import { describe, it, expect, beforeEach } from 'vitest';
import type { Struct } from '@strapi/types';

import { getRestrictRelationsTo } from '../content-types';
import { validateUpdateSchema } from '../../controllers/validation/schema';
import { validateContentTypeInput } from '../../controllers/validation/content-type';
import * as builder from '../builder';
// The real admin user definition (a plain object), so the test fails if it stops declaring the
// option. The package exports only its built entry points, not this file.
// eslint-disable-next-line import/no-relative-packages
import adminUserSchema from '../../../../../admin/server/src/content-types/User';

const END_USER_UID = 'plugin::end-users.user';
const ADMIN_USER_UID = 'admin::user';

const asContentType = (value: object) => value as unknown as Struct.ContentTypeSchema;

const endUserContentType = asContentType({
  uid: END_USER_UID,
  kind: 'collectionType',
  pluginOptions: {
    'content-type-builder': { visible: false, restrictRelationsTo: ['oneWay', 'manyWay'] },
  },
  attributes: {},
});

const adminUserContentType = asContentType({
  uid: ADMIN_USER_UID,
  kind: 'collectionType',
  ...adminUserSchema,
});

const articleContentType = asContentType({
  uid: 'api::article.article',
  kind: 'collectionType',
  attributes: {},
});

const setStrapi = (contentTypes: Struct.ContentTypeSchema[]) => {
  const services: Record<string, unknown> = { builder };

  (globalThis as any).strapi = {
    contentTypes: Object.fromEntries(contentTypes.map((ct) => [ct.uid, ct])),
    plugin: () => ({ service: (name: string) => services[name] }),
  };
};

describe('getRestrictRelationsTo', () => {
  it('uses the content-type option before the visibility check', () => {
    const ct = asContentType({
      uid: END_USER_UID,
      pluginOptions: {
        'content-type-builder': { visible: false, restrictRelationsTo: ['oneWay', 'manyWay'] },
      },
    });

    expect(getRestrictRelationsTo(ct)).toEqual(['oneWay', 'manyWay']);
  });

  it('uses the option on a visible content type too', () => {
    const ct = asContentType({
      uid: 'api::article.article',
      pluginOptions: { 'content-type-builder': { restrictRelationsTo: ['manyWay'] } },
    });

    expect(getRestrictRelationsTo(ct)).toEqual(['manyWay']);
  });

  it('keeps admin users at one-way relations', () => {
    expect(getRestrictRelationsTo(adminUserContentType)).toEqual(['oneWay', 'manyWay']);
  });

  it('ignores an option that is not a list', () => {
    const ct = asContentType({
      uid: 'api::article.article',
      pluginOptions: { 'content-type-builder': { restrictRelationsTo: 'oneWay' } },
    });

    expect(getRestrictRelationsTo(ct)).toBeNull();
  });

  it('still derives the restriction when no option is declared', () => {
    expect(getRestrictRelationsTo(articleContentType)).toBeNull();
    expect(
      getRestrictRelationsTo(
        asContentType({
          uid: 'api::hidden.hidden',
          pluginOptions: { 'content-type-builder': { visible: false } },
        })
      )
    ).toEqual([]);
    expect(getRestrictRelationsTo(asContentType({ uid: 'strapi::core-store' }))).toEqual([]);
    expect(getRestrictRelationsTo(asContentType({ uid: 'plugin::upload.file' }))).toEqual([]);
  });
});

describe('relation kinds a target accepts (schema endpoint)', () => {
  const schemaWithRelation = (relation: Record<string, unknown>, action: 'create' | 'update') => ({
    data: {
      contentTypes: [
        {
          action,
          uid: 'api::article.article',
          displayName: 'Article',
          draftAndPublish: false,
          singularName: 'article',
          pluralName: 'articles',
          kind: 'collectionType',
          attributes: [
            {
              action,
              name: 'author',
              properties: { type: 'relation', ...relation },
            },
          ],
        },
      ],
    },
  });

  // validateUpdateSchema is synchronous: it throws instead of rejecting
  const validate = (relation: Record<string, unknown>, action: 'create' | 'update' = 'create') => {
    return () => validateUpdateSchema(schemaWithRelation(relation, action));
  };

  beforeEach(() => {
    setStrapi([endUserContentType, adminUserContentType, articleContentType]);
  });

  describe.each(['create', 'update'] as const)('on %s', (action) => {
    it('rejects a manyToOne relation with a counterpart to a restricted target', () => {
      expect(
        validate(
          { relation: 'manyToOne', target: END_USER_UID, targetAttribute: 'articles' },
          action
        )
      ).toThrow(/oneWay, manyWay/);
    });

    it.each([
      { relation: 'oneToOne', targetAttribute: 'article' },
      { relation: 'oneToMany', targetAttribute: 'article' },
      { relation: 'manyToOne' },
      { relation: 'manyToMany', targetAttribute: 'articles' },
      { relation: 'morphOne', targetAttribute: 'article' },
    ])('rejects $relation (targetAttribute: $targetAttribute)', (relation) => {
      expect(validate({ ...relation, target: END_USER_UID }, action)).toThrow(
        `Relations to ${END_USER_UID} must be one of the following kinds: oneWay, manyWay`
      );
    });

    it.each([
      { relation: 'oneToOne' },
      { relation: 'oneToOne', targetAttribute: null },
      { relation: 'oneToMany' },
      { relation: 'oneToMany', targetAttribute: null },
    ])('accepts a one-way $relation (targetAttribute: $targetAttribute)', (relation) => {
      expect(validate({ ...relation, target: END_USER_UID }, action)).not.toThrow();
    });
  });

  it('does not restrict a target that declares nothing', () => {
    expect(
      validate({ relation: 'manyToOne', target: 'api::article.article', targetAttribute: 'c' })
    ).not.toThrow();
  });

  it('does not restrict a target it does not know yet', () => {
    expect(
      validate({ relation: 'manyToMany', target: 'api::new.new', targetAttribute: 'articles' })
    ).not.toThrow();
  });

  it('keeps admin users at one-way relations', () => {
    expect(
      validate({ relation: 'manyToMany', target: ADMIN_USER_UID, targetAttribute: 'articles' })
    ).toThrow(/oneWay, manyWay/);
    expect(validate({ relation: 'oneToOne', target: ADMIN_USER_UID })).not.toThrow();
    expect(validate({ relation: 'oneToMany', target: ADMIN_USER_UID })).not.toThrow();
  });

  it('accepts one-way relations to admin users from a component', () => {
    setStrapi([adminUserContentType]);

    expect(() =>
      validateUpdateSchema({
        data: {
          components: [
            {
              action: 'create',
              uid: 'shared.hero',
              displayName: 'Hero',
              category: 'shared',
              attributes: [
                {
                  action: 'create',
                  name: 'author',
                  properties: { type: 'relation', relation: 'oneToOne', target: ADMIN_USER_UID },
                },
              ],
            },
          ],
        },
      })
    ).not.toThrow();
  });
});

describe('relation kinds a target accepts (content-types endpoint)', () => {
  const contentTypeWithRelation = (relation: Record<string, unknown>) => ({
    contentType: {
      displayName: 'Article',
      singularName: 'article',
      pluralName: 'articles',
      attributes: {
        author: { type: 'relation', ...relation },
      },
    },
  });

  beforeEach(() => {
    setStrapi([endUserContentType, adminUserContentType, articleContentType]);
  });

  const validate = (relation: Record<string, unknown>) =>
    validateContentTypeInput(contentTypeWithRelation(relation) as any);

  it('rejects a manyToOne relation with a counterpart to a restricted target', async () => {
    await expect(
      validate({ relation: 'manyToOne', target: END_USER_UID, targetAttribute: 'articles' })
    ).rejects.toMatchObject({
      details: {
        errors: [
          expect.objectContaining({
            path: ['contentType', 'attributes', 'author', 'relation'],
            message: expect.stringMatching(/oneWay, manyWay/),
          }),
        ],
      },
    });
  });

  it('rejects a hand-written counterpart that skips targetAttribute', async () => {
    await expect(
      validate({ relation: 'oneToOne', target: END_USER_UID, inversedBy: 'article' })
    ).rejects.toMatchObject({
      details: { errors: [expect.objectContaining({ message: expect.stringMatching(/oneWay/) })] },
    });

    await expect(
      validate({ relation: 'oneToMany', target: END_USER_UID, mappedBy: 'article' })
    ).rejects.toMatchObject({
      details: { errors: [expect.objectContaining({ message: expect.stringMatching(/manyWay/) })] },
    });
  });

  it('rejects a unidirectional manyToOne to a restricted target', async () => {
    await expect(validate({ relation: 'manyToOne', target: END_USER_UID })).rejects.toBeDefined();
  });

  it.each([{ relation: 'oneToOne' }, { relation: 'oneToMany' }])(
    'accepts a one-way relation ($relation)',
    async (relation) => {
      await expect(validate({ ...relation, target: END_USER_UID })).resolves.toBeDefined();
    }
  );

  it('does not restrict a target that declares nothing', async () => {
    await expect(
      validate({
        relation: 'manyToOne',
        target: 'api::article.article',
        targetAttribute: 'comments',
      })
    ).resolves.toBeDefined();
  });

  it('keeps admin users at one-way relations', async () => {
    await expect(
      validate({ relation: 'manyToMany', target: ADMIN_USER_UID, targetAttribute: 'articles' })
    ).rejects.toBeDefined();
    await expect(validate({ relation: 'oneToOne', target: ADMIN_USER_UID })).resolves.toBeDefined();
  });
});
