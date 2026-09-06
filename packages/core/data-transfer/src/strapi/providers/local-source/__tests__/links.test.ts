import { collect } from '../../../../__tests__/test-utils';
import { DEFAULT_DETAILED_WARNING_LIMIT } from '../../../../utils/capped-warnings';
import { createLinksStream, formatOrphanedLinksExportSummary } from '../links';

describe('createLinksStream', () => {
  const buildStrapiWithOrphans = (orphanCount: number) => {
    const joinTableRows = Array.from({ length: orphanCount }, (_, index) => ({
      chapter_id: 1,
      node_id: 100 + index,
      chapter_ord: index + 1,
    }));

    const connection = {
      client: { connectionSettings: {} },
      queryBuilder() {
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
            if (joinMode === 'inner') {
              resolve([]);
              return;
            }

            if (joinMode === 'left') {
              resolve(
                joinTableRows.map((row) => ({
                  ...row,
                  __left_exists: row.chapter_id,
                  __right_exists: null,
                }))
              );
              return;
            }

            resolve(joinTableRows);
          },
        };

        return qb;
      },
    };

    return {
      contentTypes: {
        'api::chapter.chapter': {},
      },
      components: {},
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

  test('warns for each omitted orphan link and emits a summary when the stream completes', async () => {
    const onWarning = jest.fn();
    const strapi = buildStrapiWithOrphans(1);

    const links = await collect(createLinksStream(strapi, { onWarning }));

    expect(links).toEqual([]);
    expect(onWarning).toHaveBeenCalledTimes(2);
    expect(onWarning).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Omitting link api::chapter.chapter:1 -> api::node.node:100')
    );
    expect(onWarning).toHaveBeenNthCalledWith(2, formatOrphanedLinksExportSummary(1));
  });

  test('caps detailed orphan warnings and still emits the full summary count', async () => {
    const onWarning = jest.fn();
    const orphanCount = DEFAULT_DETAILED_WARNING_LIMIT + 5;
    const strapi = buildStrapiWithOrphans(orphanCount);

    await collect(createLinksStream(strapi, { onWarning }));

    const detailedWarnings = onWarning.mock.calls.filter(([message]) =>
      String(message).startsWith('Omitting link ')
    );
    const suppressionWarnings = onWarning.mock.calls.filter(([message]) =>
      String(message).includes('Further detailed warnings suppressed')
    );

    expect(detailedWarnings).toHaveLength(DEFAULT_DETAILED_WARNING_LIMIT);
    expect(suppressionWarnings).toHaveLength(1);
    expect(onWarning).toHaveBeenLastCalledWith(formatOrphanedLinksExportSummary(orphanCount));
  });
});
