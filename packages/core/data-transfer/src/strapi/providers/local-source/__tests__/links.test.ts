import { collect } from '../../../../__tests__/test-utils';
import { createLinksStream, formatOrphanedLinksExportSummary } from '../links';

describe('createLinksStream', () => {
  test('warns for each omitted orphan link and emits a summary when the stream completes', async () => {
    const joinTableRows = [{ chapter_id: 1, node_id: 99, chapter_ord: 1 }];
    const onWarning = jest.fn();

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

    const strapi = {
      contentTypes: {
        'api::chapter.chapter': {},
      },
      components: {},
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
            if (uid === 'api::chapter.chapter' && where.id === 1) {
              return { id: 1 };
            }

            return null;
          }),
        })),
      },
    } as unknown as import('@strapi/types').Core.Strapi;

    const links = await collect(createLinksStream(strapi, { onWarning }));

    expect(links).toEqual([]);
    expect(onWarning).toHaveBeenCalledTimes(2);
    expect(onWarning).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Omitting link api::chapter.chapter:1 -> api::node.node:99')
    );
    expect(onWarning).toHaveBeenNthCalledWith(2, formatOrphanedLinksExportSummary(1));
  });
});
