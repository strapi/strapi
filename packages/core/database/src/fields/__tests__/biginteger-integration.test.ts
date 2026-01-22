/**
 * Integration test for BigIntegerField to verify it works with the transform pipeline.
 *
 * Tests the distinction between:
 * - Internal columns (IDs, FK columns) → cast to numbers
 * - User-defined biginteger attributes → return as strings (backwards compatible)
 */
import { fromRow } from '../../query/helpers/transform';
import type { Meta } from '../../metadata';

describe('BigIntegerField Integration', () => {
  describe('Internal columns (IDs and FKs)', () => {
    // Mock metadata for a join table with internal biginteger columns
    const mockJoinTableMeta: Meta = {
      uid: 'articles_authors_lnk',
      tableName: 'articles_authors_lnk',
      attributes: {
        id: {
          type: 'bigincrements',
          columnName: 'id',
        },
        article_id: {
          type: 'biginteger',
          columnName: 'article_id',
          internalIntegerId: true, // FK column
        },
        author_id: {
          type: 'biginteger',
          columnName: 'author_id',
          internalIntegerId: true, // FK column
        },
      },
      columnToAttribute: {
        id: 'id',
        article_id: 'article_id',
        author_id: 'author_id',
      },
    } as unknown as Meta;

    it('should convert ID (bigincrements) to number', () => {
      const dbRow = {
        id: '123',
        article_id: '1',
        author_id: '2',
      };

      const result = fromRow(mockJoinTableMeta, dbRow);

      expect(result).toEqual({
        id: 123,
        article_id: 1,
        author_id: 2,
      });
    });

    it('should convert internal FK columns to numbers', () => {
      const dbRow = {
        id: '1',
        article_id: '456',
        author_id: '789',
      };

      const result = fromRow(mockJoinTableMeta, dbRow) as any;

      expect(typeof result.article_id).toBe('number');
      expect(typeof result.author_id).toBe('number');
      expect(result.article_id).toBe(456);
      expect(result.author_id).toBe(789);
    });

    it('should handle null FK values', () => {
      const dbRow = {
        id: '123',
        article_id: null,
        author_id: '1',
      };

      const result = fromRow(mockJoinTableMeta, dbRow);

      expect(result).toEqual({
        id: 123,
        article_id: null,
        author_id: 1,
      });
    });

    it('should handle large IDs within MAX_SAFE_INTEGER', () => {
      const largeId = String(Number.MAX_SAFE_INTEGER - 1000);
      const dbRow = {
        id: largeId,
        article_id: '1',
        author_id: '1',
      };

      const result = fromRow(mockJoinTableMeta, dbRow) as any;

      expect(result.id).toBe(Number(largeId));
      expect(typeof result.id).toBe('number');
    });

    it('should throw error when ID exceeds MAX_SAFE_INTEGER', () => {
      const overflowId = String(Number.MAX_SAFE_INTEGER + 1);
      const dbRow = {
        id: overflowId,
        article_id: '1',
        author_id: '1',
      };

      expect(() => fromRow(mockJoinTableMeta, dbRow)).toThrow(
        /exceeds JavaScript's MAX_SAFE_INTEGER/
      );
    });

    it('should handle arrays of join table rows', () => {
      const dbRows = [
        { id: '1', article_id: '10', author_id: '100' },
        { id: '2', article_id: '20', author_id: '200' },
        { id: '3', article_id: '30', author_id: '300' },
      ];

      const result = fromRow(mockJoinTableMeta, dbRows);

      expect(result).toEqual([
        { id: 1, article_id: 10, author_id: 100 },
        { id: 2, article_id: 20, author_id: 200 },
        { id: 3, article_id: 30, author_id: 300 },
      ]);
    });
  });

  describe('User-defined biginteger attributes', () => {
    // Mock metadata for a content type with user-defined biginteger
    const mockContentTypeMeta: Meta = {
      uid: 'api::product.product',
      tableName: 'products',
      attributes: {
        id: {
          type: 'bigincrements',
          columnName: 'id',
        },
        name: {
          type: 'string',
          columnName: 'name',
        },
        sku: {
          type: 'biginteger', // User-defined, no __internal__
          columnName: 'sku',
        },
        inventory_count: {
          type: 'biginteger', // User-defined, no __internal__
          columnName: 'inventory_count',
        },
      },
      columnToAttribute: {
        id: 'id',
        name: 'name',
        sku: 'sku',
        inventory_count: 'inventory_count',
      },
    } as unknown as Meta;

    it('should return user-defined biginteger as string (backwards compatible)', () => {
      const dbRow = {
        id: '1',
        name: 'Widget',
        sku: '123456789012345',
        inventory_count: '1000',
      };

      const result = fromRow(mockContentTypeMeta, dbRow);

      expect(result).toEqual({
        id: 1, // ID is still a number (type: bigincrements)
        name: 'Widget',
        sku: '123456789012345', // String
        inventory_count: '1000', // String
      });
    });

    it('should preserve large numbers as strings without overflow error', () => {
      // User-defined biginteger can hold values beyond MAX_SAFE_INTEGER
      const hugeBigInt = '9007199254740992'; // MAX_SAFE_INTEGER + 1
      const veryLarge = '99999999999999999999';

      const dbRow = {
        id: '1',
        name: 'Big Number Product',
        sku: hugeBigInt,
        inventory_count: veryLarge,
      };

      const result = fromRow(mockContentTypeMeta, dbRow);

      expect(result).toEqual({
        id: 1,
        name: 'Big Number Product',
        sku: hugeBigInt, // Preserved as string
        inventory_count: veryLarge, // Preserved as string
      });
    });

    it('should handle null user-defined biginteger values', () => {
      const dbRow = {
        id: '1',
        name: 'Widget',
        sku: null,
        inventory_count: '100',
      };

      const result = fromRow(mockContentTypeMeta, dbRow);

      expect(result).toEqual({
        id: 1,
        name: 'Widget',
        sku: null,
        inventory_count: '100',
      });
    });

    it('should handle arrays of rows with user-defined biginteger', () => {
      const dbRows = [
        { id: '1', name: 'Product 1', sku: '111', inventory_count: '10' },
        { id: '2', name: 'Product 2', sku: '222', inventory_count: '20' },
      ];

      const result = fromRow(mockContentTypeMeta, dbRows);

      expect(result).toEqual([
        { id: 1, name: 'Product 1', sku: '111', inventory_count: '10' },
        { id: 2, name: 'Product 2', sku: '222', inventory_count: '20' },
      ]);
    });
  });

  describe('Mixed scenarios', () => {
    // Content type with both internal FK and user-defined biginteger
    const mockMixedMeta: Meta = {
      uid: 'api::order.order',
      tableName: 'orders',
      attributes: {
        id: {
          type: 'bigincrements',
          columnName: 'id',
        },
        order_number: {
          type: 'biginteger', // User-defined
          columnName: 'order_number',
        },
        customer_id: {
          type: 'biginteger',
          columnName: 'customer_id',
          internalIntegerId: true, // FK column
        },
      },
      columnToAttribute: {
        id: 'id',
        order_number: 'order_number',
        customer_id: 'customer_id',
      },
    } as unknown as Meta;

    it('should correctly distinguish internal vs user-defined biginteger', () => {
      const dbRow = {
        id: '1',
        order_number: '9007199254740992', // User-defined, large number OK
        customer_id: '42', // Internal FK, cast to number
      };

      const result = fromRow(mockMixedMeta, dbRow);

      expect(result).toEqual({
        id: 1,
        order_number: '9007199254740992', // String preserved
        customer_id: 42, // Number
      });
    });

    it('should throw for internal FK overflow but not user-defined', () => {
      const overflowValue = String(Number.MAX_SAFE_INTEGER + 1);

      // User-defined can handle overflow
      const dbRowUserDefined = {
        id: '1',
        order_number: overflowValue,
        customer_id: '1',
      };
      expect(() => fromRow(mockMixedMeta, dbRowUserDefined)).not.toThrow();

      // Internal FK throws on overflow
      const dbRowInternalFK = {
        id: '1',
        order_number: '100',
        customer_id: overflowValue,
      };
      expect(() => fromRow(mockMixedMeta, dbRowInternalFK)).toThrow(
        /exceeds JavaScript's MAX_SAFE_INTEGER/
      );
    });
  });

  describe('Real-world scenarios', () => {
    const mockMeta: Meta = {
      uid: 'articles_links',
      tableName: 'articles_links',
      attributes: {
        id: {
          type: 'bigincrements',
          columnName: 'id',
        },
        article_id: {
          type: 'biginteger',
          columnName: 'article_id',
          internalIntegerId: true,
        },
      },
      columnToAttribute: {
        id: 'id',
        article_id: 'article_id',
      },
    } as unknown as Meta;

    it('should handle typical Strapi ID ranges (1 to millions)', () => {
      const testCases = [
        '1',
        '100',
        '1000',
        '10000',
        '100000',
        '1000000',
        '10000000',
        '100000000',
        '1000000000',
      ];

      testCases.forEach((idStr) => {
        const dbRow = { id: idStr, article_id: '1' };
        const result = fromRow(mockMeta, dbRow) as any;
        expect(result.id).toBe(Number(idStr));
        expect(typeof result.id).toBe('number');
      });
    });

    it('should maintain backwards compatibility with existing numeric IDs', () => {
      const dbRow = {
        id: '42',
        article_id: '100',
      };

      const result = fromRow(mockMeta, dbRow) as any;

      // These should all work as before
      expect(typeof result.id).toBe('number');
      expect(result.id).toBe(42);
      expect(result.id + 1).toBe(43);
      expect(result.id > 40).toBe(true);
      expect(result.id === 42).toBe(true);
    });
  });
});
