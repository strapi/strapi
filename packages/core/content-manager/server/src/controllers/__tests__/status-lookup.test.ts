/**
 * Unit tests for status lookup optimization.
 */

describe('Status Lookup Optimization', () => {
  describe('buildStatusMap', () => {
    /**
     * Helper function that replicates the status Map building logic
     * from collection-types.ts and relations.ts
     */
    const buildStatusMap = <T extends { documentId?: string | null }>(
      statuses: T[]
    ): Map<string, T[]> => {
      const statusByDocumentId = new Map<string, T[]>();
      for (const status of statuses) {
        const key = status.documentId;
        if (!key) continue; // Skip entries without a valid documentId
        const existing = statusByDocumentId.get(key);
        if (existing) {
          existing.push(status);
        } else {
          statusByDocumentId.set(key, [status]);
        }
      }
      return statusByDocumentId;
    };

    it('should group statuses by documentId', () => {
      const statuses = [
        { documentId: 'doc1', status: 'draft' },
        { documentId: 'doc2', status: 'published' },
        { documentId: 'doc1', status: 'published' },
      ];

      const result = buildStatusMap(statuses);

      expect(result.get('doc1')).toHaveLength(2);
      expect(result.get('doc2')).toHaveLength(1);
      expect(result.get('doc1')?.[0].status).toBe('draft');
      expect(result.get('doc1')?.[1].status).toBe('published');
    });

    it('should skip entries with null documentId', () => {
      const statuses = [
        { documentId: 'doc1', status: 'draft' },
        { documentId: null, status: 'orphan' },
        { documentId: 'doc2', status: 'published' },
      ];

      const result = buildStatusMap(statuses);

      expect(result.size).toBe(2);
      expect(result.has('null')).toBe(false);
      expect(result.get('doc1')).toHaveLength(1);
      expect(result.get('doc2')).toHaveLength(1);
    });

    it('should skip entries with undefined documentId', () => {
      const statuses = [
        { documentId: 'doc1', status: 'draft' },
        { documentId: undefined, status: 'orphan' },
        { documentId: 'doc2', status: 'published' },
      ];

      const result = buildStatusMap(statuses);

      expect(result.size).toBe(2);
      expect(result.has('undefined')).toBe(false);
    });

    it('should skip entries with empty string documentId', () => {
      const statuses = [
        { documentId: 'doc1', status: 'draft' },
        { documentId: '', status: 'orphan' },
        { documentId: 'doc2', status: 'published' },
      ];

      const result = buildStatusMap(statuses);

      expect(result.size).toBe(2);
      expect(result.has('')).toBe(false);
    });

    it('should return empty Map for empty input', () => {
      const result = buildStatusMap([]);

      expect(result.size).toBe(0);
    });

    it('should handle single status entry', () => {
      const statuses = [{ documentId: 'doc1', status: 'draft' }];

      const result = buildStatusMap(statuses);

      expect(result.size).toBe(1);
      expect(result.get('doc1')).toHaveLength(1);
    });

    it('should handle all null documentIds gracefully', () => {
      const statuses = [
        { documentId: null, status: 'orphan1' },
        { documentId: undefined, status: 'orphan2' },
        { documentId: '', status: 'orphan3' },
      ];

      const result = buildStatusMap(statuses);

      expect(result.size).toBe(0);
    });
  });

  describe('status lookup with locale filtering', () => {
    /**
     * Helper function that replicates the locale-aware status lookup
     * from relations.ts addStatusToRelations
     */
    const getAvailableStatuses = <T extends { documentId?: string; locale?: string }>(
      relation: { documentId?: string; locale?: string },
      statusByDocumentId: Map<string, T[]>
    ): T[] => {
      const candidates = statusByDocumentId.get(relation.documentId as string) || [];
      return relation.locale ? candidates.filter((c) => c.locale === relation.locale) : candidates;
    };

    it('should return all statuses when no locale specified', () => {
      const statusMap = new Map<string, any[]>();
      statusMap.set('doc1', [
        { documentId: 'doc1', locale: 'en', status: 'draft' },
        { documentId: 'doc1', locale: 'fr', status: 'published' },
      ]);

      const result = getAvailableStatuses({ documentId: 'doc1' }, statusMap);

      expect(result).toHaveLength(2);
    });

    it('should filter by locale when specified', () => {
      const statusMap = new Map<string, any[]>();
      statusMap.set('doc1', [
        { documentId: 'doc1', locale: 'en', status: 'draft' },
        { documentId: 'doc1', locale: 'fr', status: 'published' },
      ]);

      const result = getAvailableStatuses({ documentId: 'doc1', locale: 'en' }, statusMap);

      expect(result).toHaveLength(1);
      expect(result[0].locale).toBe('en');
    });

    it('should return empty array for non-existent documentId', () => {
      const statusMap = new Map<string, any[]>();
      statusMap.set('doc1', [{ documentId: 'doc1', locale: 'en', status: 'draft' }]);

      const result = getAvailableStatuses({ documentId: 'doc2' }, statusMap);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for undefined documentId', () => {
      const statusMap = new Map<string, any[]>();
      statusMap.set('doc1', [{ documentId: 'doc1', locale: 'en', status: 'draft' }]);

      const result = getAvailableStatuses({ documentId: undefined }, statusMap);

      expect(result).toHaveLength(0);
    });
  });
});
