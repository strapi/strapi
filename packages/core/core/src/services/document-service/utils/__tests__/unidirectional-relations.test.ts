import { load } from '../unidirectional-relations';

const createChainedQuery = (result: any[]) => {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.from = jest.fn().mockReturnValue(chain);
  chain.whereIn = jest.fn().mockReturnValue(chain);
  chain.transacting = jest.fn().mockResolvedValue(result);
  return chain;
};

const trxContext = { trx: {} };
const createMockTransaction = () => jest.fn(async (cb: any) => cb(trxContext));

const mockJoinTable = {
  name: 'nodes_related_lnk',
  joinColumn: { name: 'node_id' },
  inverseJoinColumn: { name: 'inv_node_id' },
};

describe('unidirectional-relations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('load', () => {
    it('should skip self-referential attributes (model.uid === uid) to avoid double-processing with selfReferentialRelations', async () => {
      const chain = createChainedQuery([{ id: 1, node_id: 10, inv_node_id: 10 }]);

      (global as any).strapi = {
        contentTypes: {
          'api::node.node': { uid: 'api::node.node', options: { draftAndPublish: true } },
        },
        components: {},
        db: {
          metadata: {
            get: jest.fn().mockReturnValue({
              attributes: {
                related: {
                  type: 'relation',
                  target: 'api::node.node',
                  joinTable: mockJoinTable,
                  // no inversedBy or mappedBy — unidirectional self-referential
                },
              },
            }),
          },
          transaction: createMockTransaction(),
          getConnection: jest.fn().mockReturnValue(chain),
        },
      };

      const uid = 'api::node.node' as any;
      const oldVersions = [{ id: 10, locale: '' }];
      const newVersions = [{ id: 20, locale: '' }];

      const result = await load(uid, { oldVersions, newVersions });

      // Must return empty — self-referential unidirectional relations are handled by
      // selfReferentialRelations, not here, to avoid inserting stale source FK values.
      expect(result).toHaveLength(0);
      expect(chain.transacting).not.toHaveBeenCalled();
    });

    it('should capture unidirectional relations from other content types targeting uid', async () => {
      // Node's self-referential attribute is skipped before getConnection is called,
      // so the only getConnection call will be for the article model's attribute.
      const articleChain = createChainedQuery([{ id: 5, article_id: 99, inv_node_id: 10 }]);

      (global as any).strapi = {
        contentTypes: {
          'api::node.node': { uid: 'api::node.node', options: { draftAndPublish: true } },
          'api::article.article': {
            uid: 'api::article.article',
            options: { draftAndPublish: true },
          },
        },
        components: {},
        db: {
          metadata: {
            get: jest.fn().mockImplementation((modelUid: string) => {
              if (modelUid === 'api::node.node') {
                return {
                  attributes: {
                    related: {
                      type: 'relation',
                      target: 'api::node.node',
                      joinTable: mockJoinTable,
                    },
                  },
                };
              }
              return {
                attributes: {
                  primaryNode: {
                    type: 'relation',
                    target: 'api::node.node',
                    joinTable: {
                      name: 'articles_node_lnk',
                      joinColumn: { name: 'article_id' },
                      inverseJoinColumn: { name: 'inv_node_id' },
                    },
                  },
                },
              };
            }),
          },
          transaction: createMockTransaction(),
          getConnection: jest.fn().mockReturnValue(articleChain),
        },
      };

      const uid = 'api::node.node' as any;
      const oldVersions = [{ id: 10, locale: '' }];
      const newVersions = [{ id: 20, locale: '' }];

      const result = await load(uid, { oldVersions, newVersions });

      // Only the article→node relation should be captured (not the self-referential one)
      expect(result).toHaveLength(1);
      expect(result[0].joinTable.name).toBe('articles_node_lnk');
    });
  });
});
