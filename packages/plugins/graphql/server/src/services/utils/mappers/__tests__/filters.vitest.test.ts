import { describe, expect, test } from 'vitest';
import type { Core, Struct } from '@strapi/types';

import createConstants from '../../../constants';
import operators from '../../../builders/filters/operators';
import utils from '../..';
import type { Context } from '../../../types';

/**
 * Maps GraphQL filter arguments to a Strapi query, with the GraphQL plugin services built for real
 * from a minimal Strapi instance.
 */

const models: Record<string, Partial<Struct.Schema>> = {
  'api::article.article': {
    attributes: {
      title: { type: 'string' },
      views: { type: 'integer' },
      author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
      seo: { type: 'component', component: 'shared.seo', repeatable: false },
    } as any,
  },
  'api::author.author': { attributes: { name: { type: 'string' } } as any },
  'shared.seo': { attributes: { metaTitle: { type: 'string' } } as any },
};

const createStrapi = () => {
  const services: Record<string, unknown> = {};
  const strapi = {
    plugin: () => ({ service: (name: string) => services[name] }),
    getModel: (uid: string) => models[uid],
  } as unknown as Core.Strapi;

  services.constants = createConstants();
  services.builders = { filters: { operators: operators({ strapi }) } };
  // The mappers do not read the type registry
  services.utils = utils({ strapi } as Context);

  return { strapi, mappers: (services.utils as ReturnType<typeof utils>).mappers };
};

const article = models['api::article.article'] as Struct.Schema;

describe('graphQLFiltersToStrapiQuery', () => {
  test('maps the GraphQL scalar operators of attributes to Strapi operators', () => {
    const { mappers } = createStrapi();

    expect(
      mappers.graphQLFiltersToStrapiQuery(
        { title: { containsi: 'news', not: { eq: 'draft' } }, views: { between: [1, 9] } },
        article
      )
    ).toEqual({
      title: { $containsi: 'news', $not: { $eq: 'draft' } },
      views: { $between: [1, 9] },
    });
  });

  test('maps the id and documentId virtual attributes', () => {
    const { mappers } = createStrapi();

    expect(
      mappers.graphQLFiltersToStrapiQuery(
        { documentId: { in: ['a', 'b'] }, id: { gt: 1 } },
        article
      )
    ).toEqual({ documentId: { $in: ['a', 'b'] }, id: { $gt: 1 } });
  });

  test('maps relation and component filters with the target model', () => {
    const { mappers } = createStrapi();

    expect(
      mappers.graphQLFiltersToStrapiQuery(
        { author: { name: { startsWith: 'Ada' } }, seo: { metaTitle: { null: false } } },
        article
      )
    ).toEqual({
      author: { name: { $startsWith: 'Ada' } },
      seo: { metaTitle: { $null: false } },
    });
  });

  test('maps the root level and, or, not operators and drops unknown keys', () => {
    const { mappers } = createStrapi();

    expect(
      mappers.graphQLFiltersToStrapiQuery(
        {
          or: [{ title: { eq: 'a' } }, { title: { eq: 'b' } }],
          not: { views: { lt: 3 } },
          unknown: { eq: 'x' },
        },
        article
      )
    ).toEqual({
      $or: [{ title: { $eq: 'a' } }, { title: { $eq: 'b' } }],
      $not: { views: { $lt: 3 } },
    });
  });

  test('keeps date values and returns no filters for null', () => {
    const { mappers } = createStrapi();
    const date = new Date('2026-01-01');

    expect(mappers.graphQLFiltersToStrapiQuery({ title: { eq: date } }, article)).toEqual({
      title: { $eq: date },
    });
    expect(mappers.graphQLFiltersToStrapiQuery(null, article)).toEqual({});
  });
});

describe('graphqlScalarToOperators', () => {
  test('lists the operators available for a GraphQL scalar', () => {
    const { mappers } = createStrapi();

    // The published return type is develop's, so the operators are typed here
    const operatorsOfString = mappers.graphqlScalarToOperators('String') as unknown as {
      fieldName: string;
    }[];
    const names = operatorsOfString.map((operator) => operator.fieldName);

    expect(names).toEqual(expect.arrayContaining(['eq', 'containsi', 'between', 'and', 'not']));
  });

  test('lists no operators for an unknown scalar', () => {
    const { mappers } = createStrapi();

    expect(mappers.graphqlScalarToOperators('Unknown')).toBeUndefined();
  });
});
