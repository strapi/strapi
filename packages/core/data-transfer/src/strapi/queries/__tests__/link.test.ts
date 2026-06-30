import { createLinkQuery, filterValidRelationalAttributes } from '../link';

describe('link queries realtion fitlers', () => {
  test('filter out non relation attributes', () => {
    const attributes = {
      id: { type: 'increments', columnName: 'id' },
      name: { type: 'string', required: true, columnName: 'name' },
      test: { type: 'string', columnName: 'test' },
      categories: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
        joinTable: {
          name: 'components_basic_relations_categories_lnk',
          orderColumnName: 'category_ord',
        },
      },
    };

    expect(filterValidRelationalAttributes(attributes)).toEqual({
      categories: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
        joinTable: {
          name: 'components_basic_relations_categories_lnk',
          orderColumnName: 'category_ord',
        },
      },
    });
  });

  test('filter out cmps tables from attributes', () => {
    const attributes = {
      id: { type: 'increments', columnName: 'id' },
      label: { type: 'string', default: 'toto', columnName: 'label' },
      start_date: { type: 'date', required: true, columnName: 'start_date' },
      end_date: { type: 'date', required: true, columnName: 'end_date' },
      media: {
        type: 'relation',
        relation: 'morphOne',
        target: 'plugin::upload.file',
        morphBy: 'related',
      },
      dish: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'default.dish',
        joinTable: {
          name: 'components_closingperiods_cmps',
          orderColumnName: 'order',
        },
      },
    };
    expect(filterValidRelationalAttributes(attributes)).toEqual({});
  });
});

describe('createLinkQuery', () => {
  const buildJoinTableStrapi = ({
    joinTableRows,
    existingLeftIds = new Set<number>(),
    existingRightIds = new Set<number>(),
  }: {
    joinTableRows: Record<string, unknown>[];
    existingLeftIds?: Set<number>;
    existingRightIds?: Set<number>;
  }) => {
    const connection = {
      client: { connectionSettings: {} },
      queryBuilder() {
        const qb: Record<string, unknown> = {
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          transacting: jest.fn().mockReturnThis(),
          then: (resolve: (value: unknown) => void) => resolve(joinTableRows),
        };

        return qb;
      },
    };

    return {
      db: {
        connection,
        metadata: {
          get: jest.fn(() => ({
            tableName: 'chapters',
            attributes: {
              nodes: {
                type: 'relation',
                relation: 'oneToMany',
                target: 'api::node.node',
                owner: true,
                joinTable: {
                  name: 'chapters_node_lnk',
                  joinColumn: { name: 'chapter_id' },
                  inverseJoinColumn: { name: 'node_id' },
                  orderColumnName: 'chapter_ord',
                },
              },
            },
          })),
        },
        query: jest.fn((uid: string) => ({
          findOne: jest.fn(async ({ where }: { where: { id: number } }) => {
            if (uid === 'api::chapter.chapter' && existingLeftIds.has(where.id)) {
              return { id: where.id };
            }

            if (uid === 'api::node.node' && existingRightIds.has(where.id)) {
              return { id: where.id };
            }

            return null;
          }),
        })),
      },
    } as unknown as import('@strapi/types').Core.Strapi;
  };

  test('exports join-table links when both referenced entities exist', async () => {
    const strapi = buildJoinTableStrapi({
      joinTableRows: [{ chapter_id: 1, node_id: 2, chapter_ord: 1 }],
      existingLeftIds: new Set([1]),
      existingRightIds: new Set([2]),
    });

    const links = [];

    for await (const link of createLinkQuery(strapi)().generateAll('api::chapter.chapter')) {
      links.push(link);
    }

    expect(links).toEqual([
      {
        kind: 'relation.basic',
        relation: 'oneToMany',
        left: { type: 'api::chapter.chapter', ref: 1, field: 'nodes', pos: 1 },
        right: { type: 'api::node.node', ref: 2, field: undefined },
      },
    ]);
  });

  test('does not export join-table links when the right referenced entity is missing', async () => {
    const strapi = buildJoinTableStrapi({
      joinTableRows: [{ chapter_id: 1, node_id: 99, chapter_ord: 1 }],
      existingLeftIds: new Set([1]),
    });

    const links = [];

    for await (const link of createLinkQuery(strapi)().generateAll('api::chapter.chapter')) {
      links.push(link);
    }

    expect(links).toEqual([]);
  });

  test('does not export join-table links when the left referenced entity is missing', async () => {
    const strapi = buildJoinTableStrapi({
      joinTableRows: [{ chapter_id: 1, node_id: 2, chapter_ord: 1 }],
      existingRightIds: new Set([2]),
    });

    const links = [];

    for await (const link of createLinkQuery(strapi)().generateAll('api::chapter.chapter')) {
      links.push(link);
    }

    expect(links).toEqual([]);
  });

  test('does not export joinColumn links when the relation target is missing', async () => {
    const connection = {
      client: { connectionSettings: {} },
      queryBuilder() {
        const qb: Record<string, unknown> = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          transacting: jest.fn().mockReturnThis(),
          then: (resolve: (value: unknown) => void) => resolve([{ id: 1, author_id: 42 }]),
        };

        return qb;
      },
    };

    const strapi = {
      db: {
        connection,
        metadata: {
          get: jest.fn(() => ({
            tableName: 'articles',
            attributes: {
              author: {
                type: 'relation',
                relation: 'manyToOne',
                target: 'api::author.author',
                owner: true,
                joinColumn: { name: 'author_id' },
              },
            },
          })),
        },
        query: jest.fn((uid: string) => ({
          findOne: jest.fn(async ({ where }: { where: { id: number } }) => {
            if (uid === 'api::article.article' && where.id === 1) {
              return { id: 1 };
            }

            return null;
          }),
        })),
      },
    } as unknown as import('@strapi/types').Core.Strapi;

    const links = [];

    for await (const link of createLinkQuery(strapi)().generateAll('api::article.article')) {
      links.push(link);
    }

    expect(links).toEqual([]);
  });
});
