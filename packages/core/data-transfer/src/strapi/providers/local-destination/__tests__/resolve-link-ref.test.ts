import type { Core } from '@strapi/types';

import type { ILink } from '../../../../../types';
import {
  isDocumentIdJoinColumnTarget,
  resolveLinkRef,
} from '../strategies/restore/resolve-link-ref';

const buildStrapi = (attributes: Record<string, unknown>) =>
  ({
    db: {
      metadata: {
        get: () => ({ attributes }),
      },
    },
  }) as unknown as Core.Strapi;

describe('resolveLinkRef', () => {
  const mapID = jest.fn((uid: string, id: number) => {
    const mappings: Record<string, Record<number, number>> = {
      'api::article.article': { 1: 101, 2: 102 },
    };

    return mappings[uid]?.[id];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('maps numeric refs through the entities mapper', () => {
    const link: ILink = {
      kind: 'relation.basic',
      relation: 'manyToMany',
      left: { type: 'api::article.article', ref: 1, field: 'categories' },
      right: { type: 'api::category.category', ref: 2 },
    };

    const strapi = buildStrapi({
      categories: { type: 'relation', joinTable: { name: 'articles_categories_lnk' } },
    });

    expect(resolveLinkRef(strapi, link, 'left', mapID)).toBe(101);
    expect(resolveLinkRef(strapi, link, 'right', mapID)).toBeUndefined();
    expect(mapID).toHaveBeenCalledWith('api::article.article', 1);
    expect(mapID).toHaveBeenCalledWith('api::category.category', 2);
  });

  test('passes document_id joinColumn targets through without id mapping', () => {
    const documentId = 'kq4sntx4a0kymmdpvwvyblb9';
    const link: ILink = {
      kind: 'relation.circular',
      relation: 'oneToMany',
      left: { type: 'api::article.article', ref: 1, field: 'localizations' },
      right: { type: 'api::article.article', ref: documentId },
    };

    const strapi = buildStrapi({
      localizations: {
        type: 'relation',
        joinColumn: {
          name: 'document_id',
          referencedColumn: 'document_id',
        },
      },
    });

    expect(isDocumentIdJoinColumnTarget(strapi, link, 'right')).toBe(true);
    expect(isDocumentIdJoinColumnTarget(strapi, link, 'left')).toBe(false);
    expect(resolveLinkRef(strapi, link, 'left', mapID)).toBe(101);
    expect(resolveLinkRef(strapi, link, 'right', mapID)).toBe(documentId);
    expect(mapID).toHaveBeenCalledTimes(1);
  });
});
