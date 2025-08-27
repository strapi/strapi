import { removeOrphanUnidirectionalRelations } from '../operations/remove-orphan-unidirectional-relations';
import type { Database } from '../..';

// No need for global strapi mock since we're using database-level checking

// Helper function to mock draft/publish detection
const mockDraftPublishDetection = (mockDb: any, tableSettings: { [tableName: string]: boolean }) => {
  let connectionCallCount = 0;
  const connectionResponses: any[] = [];
  
  // Build response array based on expected calls
  Object.entries(tableSettings).forEach(([tableName, hasDrafts]) => {
    connectionResponses.push({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(hasDrafts ? [{ id: 1 }] : []),
    });
  });
  
  // Add default responses for other queries
  const defaultResponse = {
    select: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockResolvedValue([]),
    whereIn: jest.fn().mockReturnThis(),
    del: jest.fn().mockResolvedValue(0),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
  };
  
  (mockDb.connection as jest.Mock).mockImplementation((tableName?: string) => {
    if (tableName && tableSettings.hasOwnProperty(tableName)) {
      // Return draft/publish detection query mock
      return {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(tableSettings[tableName] ? [{ id: 1 }] : []),
      };
    }
    // For other queries, return the default mock
    return defaultResponse;
  });
};

describe('removeOrphanUnidirectionalRelations', () => {
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    mockDb = {
      metadata: {
        values: jest.fn(),
        get: jest.fn(),
      },
      connection: jest.fn(),
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
      },
    } as unknown as jest.Mocked<Database>;

    // Setup connection mock with schema
    const schemaHasColumn = jest.fn().mockResolvedValue(true);
    const schemaHasTable = jest.fn().mockResolvedValue(false); // Most tables don't exist by default
    const connectionFn = jest.fn();
    
    mockDb.connection = connectionFn as any;
    (mockDb.connection as any).schema = { 
      hasColumn: schemaHasColumn,
      hasTable: schemaHasTable 
    };
  });

  describe('Basic functionality', () => {
    it('should return 0 when no models have metadata', async () => {
      const mockMetadataMap = new Map();
      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      expect(mockDb.connection).not.toHaveBeenCalled();
    });

    it('should skip models without attributes', async () => {
      const mockMetadataMap = new Map([
        ['model1', {}], // No attributes
      ]);
      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      expect(mockDb.logger.debug).toHaveBeenCalledWith(
        'Orphan unidirectional relations repair completed. Cleaned 0 orphaned entries.'
      );
    });

    it('should skip models with only bidirectional relations', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              bidirectionalRelation: {
                type: 'relation',
                inversedBy: 'someField',
                target: 'api::target.target',
                joinTable: { name: 'some_table' },
              },
            },
          },
        ],
      ]);
      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      expect(mockDb.connection).not.toHaveBeenCalled();
    });

    it('should process only unidirectional relations', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              unidirectionalRelation: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
              bidirectionalRelation: {
                type: 'relation',
                inversedBy: 'someField',
                target: 'api::other.other',
                joinTable: { name: 'other_table' },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockImplementation((target) => {
        if (target === 'api::tag.tag') {
          return { tableName: 'tags' };
        }
        return null;
      });

      // Mock target table without published_at column
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(false);

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      // Should only check the unidirectional relation
      expect(mockDb.metadata.get).toHaveBeenCalledWith('api::tag.tag');
      expect(mockDb.metadata.get).not.toHaveBeenCalledWith('api::other.other');
    });
  });

  describe('Join table validation', () => {
    it('should skip relations without joinTable property', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              relationWithoutJoinTable: {
                type: 'relation',
                target: 'api::target.target',
                // No joinTable property
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      expect(mockDb.metadata.get).not.toHaveBeenCalled();
    });

    it('should skip relations without target property', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              relationWithoutTarget: {
                type: 'relation',
                joinTable: { name: 'some_table' },
                // No target property
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      expect(mockDb.metadata.get).not.toHaveBeenCalled();
    });

    it('should handle missing target model metadata gracefully', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              relationToMissingTarget: {
                type: 'relation',
                target: 'api::missing.missing',
                joinTable: {
                  name: 'components_relations_missing_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'missing_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue(null); // Target model not found

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      expect(mockDb.logger.debug).toHaveBeenCalledWith(
        'Target model api::missing.missing not found, skipping components_relations_missing_lnk'
      );
    });
  });

  describe('Draft/publish logic', () => {
    it('should skip target models without published_at column', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              relationToNonPublishable: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Mock target table without published_at column
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(false);

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
    });

    it('should handle missing target content type gracefully', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              relationToErrorTarget: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Don't mock the target content type - it won't exist in strapi.contentTypes

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
    });
  });

  describe('Ghost relation detection and cleanup', () => {
    it('should detect and remove ghost relations with publication state mismatches', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              ghostRelation: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Mock target table with published_at column
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);

      // Mock the join entries query result
      const joinEntries = [
        {
          join_id: 1,
          source_id: 10,
          target_id: 101, // Draft version
          target_published_at: null,
        },
        {
          join_id: 2,
          source_id: 10,
          target_id: 102, // Published version (ghost)
          target_published_at: '2023-01-01T00:00:00Z',
        },
      ];

      // Mock the main query chain
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockResolvedValue(joinEntries),
      };

      // Mock the draft target lookup query
      const mockDraftQuery = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ document_id: 'doc-123' }),
      };

      // Mock the published version lookup query
      const mockPublishedQuery = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: 102, document_id: 'doc-123' }),
      };

      // Mock the delete query
      const mockDeleteQuery = {
        whereIn: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1),
      };

      (mockDb.connection as unknown as jest.Mock)
        .mockReturnValueOnce({  // D&P detection query for tags
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 1 }]),  // Has draft entries
        })
        .mockReturnValueOnce(mockQuery) // Main query
        .mockReturnValueOnce(mockDraftQuery) // Draft lookup
        .mockReturnValueOnce(mockPublishedQuery) // Published lookup
        .mockReturnValueOnce(mockDeleteQuery); // Delete query

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(1);
      expect(mockDeleteQuery.whereIn).toHaveBeenCalledWith('id', [2]);
      expect(mockDeleteQuery.del).toHaveBeenCalled();
      expect(mockDb.logger.debug).toHaveBeenCalledWith(
        'Ghost relation detected: source 10 points to both draft (101) and published (102) versions'
      );
      expect(mockDb.logger.debug).toHaveBeenCalledWith(
        'Removed 1 ghost relations with publication state mismatches from components_relations_tag_lnk'
      );
    });

    it('should handle empty join tables gracefully', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              emptyRelation: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Mock target table with published_at column
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockResolvedValue([]), // Empty join table
      };

      (mockDb.connection as unknown as jest.Mock).mockReturnValue(mockQuery);

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
    });

    it('should handle entries with single relations (no duplicates)', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              singleRelation: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Mock target table with published_at column
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);

      const joinEntries = [
        {
          join_id: 1,
          source_id: 10,
          target_id: 101,
          target_published_at: null,
        },
        {
          join_id: 2,
          source_id: 11, // Different source
          target_id: 102,
          target_published_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockResolvedValue(joinEntries),
      };

      (mockDb.connection as unknown as jest.Mock).mockReturnValue(mockQuery);

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
    });

    it('should handle missing published versions', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              draftOnlyRelation: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Mock target table with published_at column
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);

      const joinEntries = [
        {
          join_id: 1,
          source_id: 10,
          target_id: 101,
          target_published_at: null,
        },
        {
          join_id: 2,
          source_id: 10,
          target_id: 102,
          target_published_at: null,
        },
      ];

      const mockMainQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockResolvedValue(joinEntries),
      };

      const mockDraftQuery = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ document_id: 'doc-123' }),
      };

      const mockPublishedQuery = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null), // No published version
      };

      (mockDb.connection as unknown as jest.Mock)
        .mockReturnValueOnce(mockMainQuery)
        .mockReturnValueOnce(mockDraftQuery)
        .mockReturnValueOnce(mockPublishedQuery);

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle database query failures gracefully', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              errorRelation: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Mock target table with published_at column
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      (mockDb.connection as unknown as jest.Mock)
        .mockReturnValueOnce({  // D&P detection query for tags
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 1 }]),
        })
        .mockReturnValue(mockQuery);

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      // Error is handled silently in findPublicationStateMismatches and returns []
    });

    it('should handle deletion failures gracefully', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              deletionErrorRelation: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Mock target table with published_at column
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);

      const joinEntries = [
        {
          join_id: 1,
          source_id: 10,
          target_id: 101,
          target_published_at: null,
        },
        {
          join_id: 2,
          source_id: 10,
          target_id: 102,
          target_published_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockMainQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockResolvedValue(joinEntries),
      };

      const mockDraftQuery = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ document_id: 'doc-123' }),
      };

      const mockPublishedQuery = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: 102, document_id: 'doc-123' }),
      };

      const mockDeleteQuery = {
        whereIn: jest.fn().mockReturnThis(),
        del: jest.fn().mockRejectedValue(new Error('Deletion failed')),
      };

      (mockDb.connection as unknown as jest.Mock)
        .mockReturnValueOnce({  // D&P detection query for tags
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 1 }]),
        })
        .mockReturnValueOnce(mockMainQuery)
        .mockReturnValueOnce(mockDraftQuery)
        .mockReturnValueOnce(mockPublishedQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      expect(mockDb.logger.error).toHaveBeenCalledWith(
        'Failed to clean join table "components_relations_tag_lnk": Deletion failed'
      );
    });
  });

  describe('Parent draft/publish scenarios', () => {
    it('should skip component instances when parent models do not support draft/publish', async () => {
      const mockMetadataMap = new Map([
        [
          'basic.relations', // Component with relations
          {
            uid: 'basic.relations',
            tableName: 'components_basic_relations',
            attributes: {
              tags: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_basic_relations_tags_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
        [
          'api::nodp.nodp', // Parent content type without D&P
          {
            uid: 'api::nodp.nodp',
            tableName: 'nodps',
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockImplementation((target) => {
        if (target === 'api::tag.tag') return { tableName: 'tags' };
        return null;
      });

      // Mock that target supports D&P
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);

      // Mock component parent detection - simulate finding parent in nodps_cmps table
      (mockDb.connection as any).schema.hasTable.mockImplementation((tableName: string) => {
        return Promise.resolve(tableName === 'nodps_cmps');
      });

      // Mock component join table query showing instance 44 belongs to parent entity 1
      const mockComponentQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ entity_id: 1 })
      };

      // Mock main join entries query
      const joinEntries = [
        {
          join_id: 1,
          source_id: 44,
          target_id: 101,
          target_published_at: null,
        },
        {
          join_id: 2,
          source_id: 44,
          target_id: 102,
          target_published_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockMainQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockResolvedValue(joinEntries),
      };

      (mockDb.connection as unknown as jest.Mock)
        .mockImplementation((tableName?: string) => {
          if (tableName === 'tags') {
            return {
              where: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue([{ id: 1 }]),  // Has draft entries
            };
          }
          if (tableName === 'components_basic_relations_tags_lnk') {
            return mockMainQuery;
          }
          if (tableName === 'nodps_cmps') {
            return mockComponentQuery;
          }
          if (tableName === 'nodps') {
            return {
              where: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue([]),  // No draft entries
            };
          }
          return {
            where: jest.fn().mockReturnThis(),
            first: jest.fn().mockResolvedValue(null),
          };
        });

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      // Should attempt to look for parent but not find one, so processing is skipped
      expect(mockDb.logger.debug).toHaveBeenCalledWith(
        'Looking for parent of component basic.relations instance 44'
      );
    });

    it('should process component instances when parent model supports draft/publish', async () => {
      const mockMetadataMap = new Map([
        [
          'basic.relations',
          {
            uid: 'basic.relations',
            tableName: 'components_basic_relations',
            attributes: {
              tags: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_basic_relations_tags_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
        [
          'api::product.product', // Parent with draft/publish
          {
            uid: 'api::product.product',
            tableName: 'products',
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Mock draft/publish detection: both target and parent support D&P
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);
      mockDraftPublishDetection(mockDb, {
        'tags': true,     // Has draft entries - supports D&P  
        'products': true, // Has draft entries - supports D&P
      });

      // Mock component parent detection - simulate finding parent in products_cmps table
      (mockDb.connection as any).schema.hasTable.mockImplementation((tableName: string) => {
        return Promise.resolve(tableName === 'products_cmps');
      });

      // Mock component join table query showing instance 44 belongs to parent entity 1
      const mockComponentQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ entity_id: 1 })
      };

      // Mock empty join table (no ghost relations to clean)
      const mockMainQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockResolvedValue([]),
      };

      (mockDb.connection as unknown as jest.Mock)
        .mockReturnValueOnce(mockMainQuery)       // Main join query
        .mockReturnValueOnce(mockComponentQuery); // Component parent query

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      // Should process the component (no skipping message)
      expect(mockDb.logger.debug).not.toHaveBeenCalledWith(
        expect.stringMatching(/Skipping component instance.*parent.*doesn't support D&P/)
      );
    });

    it('should process regular content type relations without parent checks', async () => {
      const mockMetadataMap = new Map([
        [
          'api::article.article', // Regular content type, not a component
          {
            uid: 'api::article.article',
            tableName: 'articles',
            attributes: {
              tags: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'articles_tags_lnk',
                  joinColumn: { name: 'article_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockReturnValue({ tableName: 'tags' });

      // Mock target table with published_at column
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);

      // Mock empty join table
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockResolvedValue([]),
      };

      (mockDb.connection as unknown as jest.Mock).mockReturnValue(mockQuery);

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(0);
      // Should not have any parent-related debug messages since this is not a component
      expect(mockDb.logger.debug).not.toHaveBeenCalledWith(
        expect.stringMatching(/Skipping component.*no parent content types support draft\/publish/)
      );
    });
  });

  describe('Integration tests', () => {
    it('should return correct total count of cleaned entries across multiple models', async () => {
      const mockMetadataMap = new Map([
        [
          'model1',
          {
            attributes: {
              relation1: {
                type: 'relation',
                target: 'api::tag.tag',
                joinTable: {
                  name: 'components_relations_tag_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'tag_id' },
                },
              },
            },
          },
        ],
        [
          'model2',
          {
            attributes: {
              relation2: {
                type: 'relation',
                target: 'api::category.category',
                joinTable: {
                  name: 'components_relations_category_lnk',
                  joinColumn: { name: 'relations_id' },
                  inverseJoinColumn: { name: 'category_id' },
                },
              },
            },
          },
        ],
      ]);

      (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());
      (mockDb.metadata.get as jest.Mock).mockImplementation((target) => {
        if (target === 'api::tag.tag') return { tableName: 'tags' };
        if (target === 'api::category.category') return { tableName: 'categories' };
        return null;
      });

      // Mock both target tables with published_at columns
      (mockDb.connection as any).schema.hasColumn.mockResolvedValue(true);

      // Mock responses for the first model
      const firstModelQueries = [
        {
          select: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockResolvedValue([
            { join_id: 1, source_id: 10, target_id: 101, target_published_at: null },
            { join_id: 2, source_id: 10, target_id: 102, target_published_at: '2023-01-01T00:00:00Z' },
          ]),
        },
        {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ document_id: 'doc-123' }),
        },
        {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          whereNotNull: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ id: 102, document_id: 'doc-123' }),
        },
        {
          whereIn: jest.fn().mockReturnThis(),
          del: jest.fn().mockResolvedValue(1),
        },
      ];

      // Mock responses for the second model
      const secondModelQueries = [
        {
          select: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockResolvedValue([
            { join_id: 3, source_id: 20, target_id: 201, target_published_at: null },
            { join_id: 4, source_id: 20, target_id: 202, target_published_at: '2023-01-01T00:00:00Z' },
          ]),
        },
        {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ document_id: 'doc-456' }),
        },
        {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          whereNotNull: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ id: 202, document_id: 'doc-456' }),
        },
        {
          whereIn: jest.fn().mockReturnThis(),
          del: jest.fn().mockResolvedValue(1),
        },
      ];

      (mockDb.connection as unknown as jest.Mock)
        .mockReturnValueOnce({  // D&P detection query for tags
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 1 }]),
        })
        .mockReturnValueOnce(firstModelQueries[0])
        .mockReturnValueOnce(firstModelQueries[1])
        .mockReturnValueOnce(firstModelQueries[2])
        .mockReturnValueOnce(firstModelQueries[3])
        .mockReturnValueOnce({  // D&P detection query for categories
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 1 }]),
        })
        .mockReturnValueOnce(secondModelQueries[0])
        .mockReturnValueOnce(secondModelQueries[1])
        .mockReturnValueOnce(secondModelQueries[2])
        .mockReturnValueOnce(secondModelQueries[3]);

      const result = await removeOrphanUnidirectionalRelations(mockDb);

      expect(result).toBe(2); // 1 from each model
      expect(mockDb.logger.debug).toHaveBeenCalledWith(
        'Orphan unidirectional relations repair completed. Cleaned 2 orphaned entries.'
      );
    });
  });
});