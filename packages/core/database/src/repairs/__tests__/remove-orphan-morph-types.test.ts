import { removeOrphanMorphType } from '../operations/remove-orphan-morph-types';
import type { Database } from '../..';

const PIVOT_COLUMN = 'component_type';
const DEFAULT_TYPE = 'default_mycompo';

describe('removeOrphanMorphType', () => {
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    mockDb = {
      metadata: {
        values: jest.fn(),
        get: jest.fn(),
      },
      connection: jest.fn().mockImplementation(() => ({
        distinct: jest.fn().mockReturnValue({
          pluck: jest.fn().mockResolvedValue(['validType', DEFAULT_TYPE]),
        }),
        where: jest.fn().mockReturnValue({
          del: jest.fn().mockResolvedValue(1),
        }),
      })),
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
      },
    } as unknown as jest.Mocked<Database>;
  });

  it('should log debug messages and remove orphan morph types', async () => {
    const mockMetadataMap = new Map([
      [
        'model1',
        {
          attributes: {
            someRelation: {
              type: 'relation',
              relation: 'morph',
              joinTable: {
                name: 'some_table',
                pivotColumns: [PIVOT_COLUMN],
              },
              target: 'someTarget',
            },
          },
        },
      ],
    ]);

    (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());

    mockDb.metadata.get = jest.fn().mockImplementation((type: string) => {
      if (type === 'validType') {
        return {}; // Simulate valid metadata
      }
      throw new Error('Metadata not found'); // Simulate missing metadata
    }) as jest.MockedFunction<typeof mockDb.metadata.get>;

    await removeOrphanMorphType(mockDb, { pivot: PIVOT_COLUMN });

    expect(mockDb.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Removing orphaned morph type: "${PIVOT_COLUMN}"`)
    );
    expect(mockDb.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Removing invalid morph type "${DEFAULT_TYPE}"`)
    );
    expect(mockDb.connection).toHaveBeenCalledWith('some_table');
  });

  it('should not query the database when there are no attributes with the specified pivot', async () => {
    const mockMetadataMap = new Map([
      [
        'model1',
        {
          attributes: {
            unrelatedRelation: {
              type: 'relation',
              relation: 'other',
              joinTable: {
                name: 'unrelated_table',
                pivotColumns: ['unrelated'],
              },
              target: 'someTarget',
            },
          },
        },
      ],
    ]);

    (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());

    await removeOrphanMorphType(mockDb, { pivot: PIVOT_COLUMN });

    expect(mockDb.connection).not.toHaveBeenCalled();
    expect(mockDb.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Removing orphaned morph type: "${PIVOT_COLUMN}"`)
    );
  });

  it('should only query models with the specified pivot column', async () => {
    const mockMetadataMap = new Map([
      [
        'model1',
        {
          attributes: {
            someRelation: {
              type: 'relation',
              relation: 'morph',
              joinTable: {
                name: 'table_with_component_type',
                pivotColumns: [PIVOT_COLUMN],
              },
              target: 'someTarget',
            },
          },
        },
      ],
      [
        'model2',
        {
          attributes: {
            anotherRelation: {
              type: 'relation',
              relation: 'other',
              joinTable: {
                name: 'table_without_component_type',
                pivotColumns: ['other_column'],
              },
              target: 'anotherTarget',
            },
          },
        },
      ],
      [
        'model3',
        {
          attributes: {
            yetAnotherRelation: {
              type: 'relation',
              relation: 'morph',
              joinTable: {
                name: 'another_table_with_component_type',
                pivotColumns: [PIVOT_COLUMN],
              },
              target: 'yetAnotherTarget',
            },
          },
        },
      ],
    ]);

    (mockDb.metadata.values as jest.Mock).mockReturnValue(mockMetadataMap.values());

    mockDb.metadata.get = jest.fn().mockImplementation((type: string) => {
      if (type === 'validType') {
        return {}; // Simulate valid metadata
      }
      throw new Error('Metadata not found'); // Simulate missing metadata
    }) as jest.MockedFunction<typeof mockDb.metadata.get>;

    await removeOrphanMorphType(mockDb, { pivot: PIVOT_COLUMN });

    expect(mockDb.connection).toHaveBeenCalledWith('table_with_component_type');
    expect(mockDb.connection).toHaveBeenCalledWith('another_table_with_component_type');
    expect(mockDb.connection).not.toHaveBeenCalledWith('table_without_component_type');

    expect(mockDb.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(
        `Removing invalid morph type "${DEFAULT_TYPE}" from table "table_with_component_type".`
      )
    );
    expect(mockDb.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(
        `Removing invalid morph type "${DEFAULT_TYPE}" from table "another_table_with_component_type".`
      )
    );
  });
});
