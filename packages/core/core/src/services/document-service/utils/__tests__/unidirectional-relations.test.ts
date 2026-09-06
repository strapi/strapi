import { load } from '../unidirectional-relations';

const createChainedQuery = (result: any[]) => {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.from = jest.fn().mockReturnValue(chain);
  chain.whereIn = jest.fn().mockReturnValue(chain);
  chain.whereNotIn = jest.fn().mockReturnValue(chain);
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
    it('should exclude self-referential rows where the source is also being republished (handled by selfReferentialRelations)', async () => {
      // The DB returns a row where both source and target are the same entry being republished.
      // After the fix, whereNotIn filters it out, so no relation is captured.
      const chain = createChainedQuery([]);

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
      // oldVersions id=10 is the entry being republished.
      const oldVersions = [{ id: 10, locale: '' }];
      const newVersions = [{ id: 20, locale: '' }];

      const result = await load(uid, { oldVersions, newVersions });

      // No relation is captured: the DB mock returns [] because whereNotIn('node_id', [10])
      // excludes the row where both source and target are the republished entry.
      expect(result).toHaveLength(0);

      // The query IS now executed (unlike before); whereNotIn must have been called.
      expect(chain.whereNotIn).toHaveBeenCalledWith('node_id', [10]);
      expect(chain.transacting).toHaveBeenCalled();
    });

    it('should capture unidirectional relations from other content types targeting uid', async () => {
      // Node's self-referential attribute is processed but whereNotIn excludes its row,
      // so the only captured relation is from the article model's attribute.
      const nodeChain = createChainedQuery([]);
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
          // Route the first call (node self-ref) to the empty chain, second (article) to articleChain
          getConnection: jest.fn().mockReturnValueOnce(nodeChain).mockReturnValueOnce(articleChain),
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

    it('should capture self-referential rows where the source (parent) is NOT being republished — the bug scenario', async () => {
      // This is the exact bug: "Home" (node_id=99) has a relation to "Test 3122" (inv_node_id=10).
      // Only "Test 3122" is being republished (oldVersions=[10]). "Home" is not.
      // The whereNotIn guard must NOT exclude this row, so we capture it and re-point it to
      // the new published version (inv_node_id=20) in sync().
      const chain = createChainedQuery([{ id: 5, node_id: 99, inv_node_id: 10 }]);

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
      // Only Test 3122 (id=10) is being republished. Home (id=99) is not.
      const oldVersions = [{ id: 10, locale: '' }];
      const newVersions = [{ id: 20, locale: '' }];

      const result = await load(uid, { oldVersions, newVersions });

      // The row [Home(99) → Test3122(10)] must be captured so sync() can
      // re-point it to [Home(99) → new-Test3122(20)].
      expect(result).toHaveLength(1);
      expect(result[0].relations).toHaveLength(1);
      expect(result[0].relations[0]).toMatchObject({ node_id: 99, inv_node_id: 10 });

      // whereNotIn was called with the old version ids so only source=99 passes through
      expect(chain.whereNotIn).toHaveBeenCalledWith('node_id', [10]);
    });
  });
});
