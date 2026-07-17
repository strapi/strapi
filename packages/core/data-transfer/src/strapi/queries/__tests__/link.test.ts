import { createLinkQuery, filterValidRelationalAttributes } from '../link';

describe('link queries relation filters', () => {
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
  const createQueryBuilderMock = ({
    rows,
    filterInnerJoin,
    annotateLeftJoin,
  }: {
    rows: Record<string, unknown>[];
    filterInnerJoin?: (row: Record<string, unknown>) => boolean;
    annotateLeftJoin?: (row: Record<string, unknown>) => Record<string, unknown>;
  }) => {
    let joinMode: 'inner' | 'left' | null = null;

    const qb: Record<string, unknown> = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      innerJoin: jest.fn(function innerJoin() {
        joinMode = 'inner';
        return this;
      }),
      leftJoin: jest.fn(function leftJoin() {
        joinMode = 'left';
        return this;
      }),
      whereNotNull: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      transacting: jest.fn().mockReturnThis(),
      then(resolve: (value: unknown) => void) {
        if (joinMode === 'inner' && filterInnerJoin) {
          resolve(rows.filter(filterInnerJoin));
          return;
        }

        if (joinMode === 'left' && annotateLeftJoin) {
          resolve(rows.map(annotateLeftJoin));
          return;
        }

        resolve(rows);
      },
    };

    return qb;
  };

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
      queryBuilder: jest.fn(() =>
        createQueryBuilderMock({
          rows: joinTableRows,
          filterInnerJoin: (row) =>
            existingLeftIds.has(row.chapter_id as number) &&
            existingRightIds.has(row.node_id as number),
          annotateLeftJoin: (row) => ({
            ...row,
            __left_exists: existingLeftIds.has(row.chapter_id as number) ? row.chapter_id : null,
            __right_exists: existingRightIds.has(row.node_id as number) ? row.node_id : null,
          }),
        })
      ),
    };

    return {
      db: {
        connection,
        metadata: {
          get: jest.fn((uid: string) => {
            if (uid === 'api::node.node') {
              return { tableName: 'nodes', attributes: {} };
            }

            return {
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
            };
          }),
        },
        query: jest.fn(),
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
      queryBuilder: () =>
        createQueryBuilderMock({
          rows: [{ id: 1, author_id: 42 }],
          filterInnerJoin: () => false,
        }),
    };

    const strapi = {
      db: {
        connection,
        metadata: {
          get: jest.fn((uid: string) => {
            if (uid === 'api::author.author') {
              return { tableName: 'authors', attributes: {} };
            }

            return {
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
            };
          }),
        },
        query: jest.fn(),
      },
    } as unknown as import('@strapi/types').Core.Strapi;

    const links = [];

    for await (const link of createLinkQuery(strapi)().generateAll('api::article.article')) {
      links.push(link);
    }

    expect(links).toEqual([]);
  });

  test('exports joinColumn links using referencedColumn when it is not id', async () => {
    const connection = {
      client: { connectionSettings: {} },
      queryBuilder: () =>
        createQueryBuilderMock({
          rows: [
            { id: 1, document_id: 'doc-1' },
            { id: 2, document_id: 'doc-1' },
          ],
          filterInnerJoin: (row) => row.document_id === 'doc-1',
        }),
    };

    const strapi = {
      db: {
        connection,
        metadata: {
          get: jest.fn((uid: string) => ({
            tableName: 'articles',
            attributes: {
              localizations: {
                type: 'relation',
                relation: 'oneToMany',
                target: uid,
                owner: true,
                joinColumn: { name: 'document_id', referencedColumn: 'document_id' },
              },
            },
          })),
        },
        query: jest.fn(),
      },
    } as unknown as import('@strapi/types').Core.Strapi;

    const links = [];

    for await (const link of createLinkQuery(strapi)().generateAll('api::article.article')) {
      links.push(link);
    }

    expect(links).toEqual([
      {
        kind: 'relation.circular',
        relation: 'oneToMany',
        left: { type: 'api::article.article', ref: 1, field: 'localizations' },
        right: { type: 'api::article.article', ref: 'doc-1' },
      },
      {
        kind: 'relation.circular',
        relation: 'oneToMany',
        left: { type: 'api::article.article', ref: 2, field: 'localizations' },
        right: { type: 'api::article.article', ref: 'doc-1' },
      },
    ]);
  });

  test('uses a single left-join query when reporting orphaned join-table links', async () => {
    const onOrphanedLink = jest.fn();
    const strapi = buildJoinTableStrapi({
      joinTableRows: [
        { chapter_id: 1, node_id: 2, chapter_ord: 1 },
        { chapter_id: 1, node_id: 99, chapter_ord: 2 },
      ],
      existingLeftIds: new Set([1]),
      existingRightIds: new Set([2]),
    });

    const queryBuilder = strapi.db.connection.queryBuilder as jest.Mock;
    const links = [];

    for await (const link of createLinkQuery(strapi, undefined, { onOrphanedLink })().generateAll(
      'api::chapter.chapter'
    )) {
      links.push(link);
    }

    expect(queryBuilder).toHaveBeenCalledTimes(1);
    expect(links).toEqual([
      expect.objectContaining({
        left: expect.objectContaining({ ref: 1 }),
        right: expect.objectContaining({ ref: 2 }),
      }),
    ]);
    expect(onOrphanedLink).toHaveBeenCalledTimes(1);
    expect(onOrphanedLink).toHaveBeenCalledWith(
      expect.objectContaining({
        left: expect.objectContaining({ type: 'api::chapter.chapter', ref: 1 }),
        right: expect.objectContaining({ type: 'api::node.node', ref: 99 }),
      })
    );
  });

  test('batch-checks morph targets instead of per-link existence queries', async () => {
    const onOrphanedLink = jest.fn();
    const findMany = jest.fn().mockResolvedValue([{ id: 10 }]);
    const findOne = jest.fn();

    const morphRows = [
      {
        entity_id: 1,
        related_id: 10,
        related_type: 'api::article.article',
        field: 'cover',
        order: 1,
      },
      {
        entity_id: 1,
        related_id: 99,
        related_type: 'api::article.article',
        field: 'cover',
        order: 2,
      },
      {
        entity_id: 2,
        related_id: 20,
        related_type: 'api::category.category',
        field: 'cover',
        order: 1,
      },
    ];

    const connection = {
      client: { connectionSettings: {} },
      queryBuilder() {
        const qb: Record<string, unknown> = {
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          transacting: jest.fn().mockReturnThis(),
          then(resolve: (value: unknown) => void) {
            resolve(morphRows);
          },
        };
        return qb;
      },
    };

    const strapi = {
      db: {
        connection,
        metadata: {
          get: jest.fn(() => ({
            tableName: 'files',
            attributes: {
              related: {
                type: 'relation',
                relation: 'morphToMany',
                owner: true,
                joinTable: {
                  name: 'files_related_morphs',
                  joinColumn: { name: 'entity_id' },
                  morphColumn: {
                    idColumn: { name: 'related_id' },
                    typeColumn: { name: 'related_type' },
                  },
                },
              },
            },
          })),
        },
        query: jest.fn(() => ({ findMany, findOne })),
      },
    } as unknown as import('@strapi/types').Core.Strapi;

    const links = [];

    for await (const link of createLinkQuery(strapi, undefined, { onOrphanedLink })().generateAll(
      'plugin::upload.file'
    )) {
      links.push(link);
    }

    expect(findOne).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { $in: expect.arrayContaining([10, 99]) } },
      })
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { $in: [20] } },
      })
    );
    expect(links).toEqual([
      expect.objectContaining({
        left: expect.objectContaining({ ref: 1 }),
        right: expect.objectContaining({ type: 'api::article.article', ref: 10 }),
      }),
    ]);
    expect(onOrphanedLink).toHaveBeenCalledTimes(2);
  });
});
