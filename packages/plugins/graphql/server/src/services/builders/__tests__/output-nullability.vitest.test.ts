import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import createTypeBuilder from '../type';

/** A strapi whose graphql plugin offers what `buildTypeDefinition` reads, opted in to nullable output or not */
const makeStrapi = (optedIn: boolean) => {
  const services: Record<string, any> = {
    extension: {
      shadowCRUD: () => ({ field: () => ({ hasOutputEnabled: () => true }) }),
      isRequiredOutputRelaxed: () => optedIn,
    },
    utils: {
      naming: {
        getTypeName: () => 'Article',
        getComponentName: () => 'Seo',
      },
      attributes: {
        isStrapiScalar: (attribute: any) => ['string', 'text'].includes(attribute.type),
        isComponent: () => false,
        isDynamicZone: () => false,
        isEnumeration: () => false,
        isMedia: () => false,
        isMorphRelation: () => false,
        isRelation: () => false,
      },
      mappers: { strapiScalarToGraphQLScalar: () => 'String' },
    },
  };

  return {
    plugin(name: string) {
      if (name === 'graphql') {
        return { service: (service: string) => services[service], config: () => false };
      }

      return undefined;
    },
  } as any;
};

const article = {
  uid: 'api::article.article',
  modelType: 'contentType',
  kind: 'collectionType',
  options: {},
  attributes: {
    title: { type: 'string', required: true },
    body: { type: 'text' },
  },
} as any;

/** What `buildTypeDefinition` declares: each field, and whether it is non-null */
const fieldsOf = (optedIn: boolean) => {
  const fields: Record<string, { nonNull: boolean }> = {};

  const builder = (nonNull: boolean): any => ({
    get nonNull() {
      return builder(true);
    },
    id(name: string) {
      fields[name] = { nonNull };
    },
    field(name: string) {
      fields[name] = { nonNull };
    },
  });

  const { buildTypeDefinition } = createTypeBuilder({ strapi: makeStrapi(optedIn) } as any);

  (buildTypeDefinition(article) as any).value.definition(builder(false));

  return fields;
};

describe('output types', () => {
  // `isPrivateAttribute` reads the project's private attributes from the global
  beforeAll(() => {
    (globalThis as any).strapi = { config: { get: (_key: string, fallback: unknown) => fallback } };
  });

  afterAll(() => {
    delete (globalThis as any).strapi;
  });

  it('keep required fields non-null when no plugin opted in', () => {
    expect(fieldsOf(false)).toEqual({
      documentId: { nonNull: true },
      title: { nonNull: true },
      body: { nonNull: false },
    });
  });

  it('make required output fields nullable once a plugin opted in, and keep documentId non-null', () => {
    expect(fieldsOf(true)).toEqual({
      documentId: { nonNull: true },
      title: { nonNull: false },
      body: { nonNull: false },
    });
  });
});

describe('relation fields where the association resolver hides the relation', () => {
  beforeAll(() => {
    (globalThis as any).strapi = { config: { get: (_key: string, fallback: unknown) => fallback } };
  });

  afterAll(() => {
    delete (globalThis as any).strapi;
  });

  /** The resolvers `buildTypeDefinition` declares for `tags` (to-many) and `folder` (to-one) */
  const relationResolvers = () => {
    const tag = { uid: 'api::tag.tag', modelType: 'contentType', attributes: {} };
    const services: Record<string, any> = {
      extension: {
        shadowCRUD: () => ({
          field: () => ({ hasOutputEnabled: () => true }),
          isDisabled: () => false,
        }),
        use: vi.fn(),
        isRequiredOutputRelaxed: () => false,
      },
      utils: {
        naming: {
          getTypeName: () => 'Article',
          getRelationResponseCollectionName: () => 'TagRelationResponseCollection',
        },
        attributes: {
          isStrapiScalar: () => false,
          isComponent: () => false,
          isDynamicZone: () => false,
          isEnumeration: () => false,
          isMedia: () => false,
          isMorphRelation: () => false,
          isRelation: (attribute: any) => attribute.type === 'relation',
        },
        mappers: { strapiScalarToGraphQLScalar: () => 'String' },
      },
      builders: {
        utils: { getContentTypeArgs: () => ({}) },
        // A relation the parent's field rules hide resolves to null
        get: () => ({ buildAssociationResolver: () => async () => null }),
      },
    };
    const strapi = {
      plugin: (name: string) =>
        name === 'graphql'
          ? { service: (service: string) => services[service], config: () => false }
          : undefined,
      getModel: () => tag,
    } as any;
    const withRelations = {
      ...article,
      attributes: {
        tags: { type: 'relation', relation: 'oneToMany', target: 'api::tag.tag' },
        folder: { type: 'relation', relation: 'manyToOne', target: 'api::tag.tag' },
      },
    };
    const resolvers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
    const builder: any = {
      get nonNull() {
        return builder;
      },
      id() {},
      field(name: string, config: { resolve?: any }) {
        resolvers[name] = config.resolve;
      },
    };

    (
      createTypeBuilder({ strapi } as any).buildTypeDefinition(withRelations) as any
    ).value.definition(builder);

    return resolvers;
  };

  it('answer an empty list for a hidden to-many and null for a hidden to-one, without throwing', async () => {
    const resolvers = relationResolvers();

    expect(await resolvers.tags({}, {}, {}, {})).toEqual([]);
    expect(await resolvers.folder({}, {}, {}, {})).toBeNull();
  });
});
