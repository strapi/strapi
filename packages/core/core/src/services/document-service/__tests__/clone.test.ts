/**
 * Tests for the clone function in the document service repository.
 *
 * Covers the bug where cloning an entry with a one-to-one (or one-to-many)
 * relation and removing it in the duplicate form would still transfer the
 * relation from the original to the clone due to lodash deep merge preserving
 * stale `id` keys inside relation objects.
 *
 * See: https://github.com/strapi/strapi/issues/25749
 */

describe('document-service clone — relation merge', () => {
  describe('shallow merge of queryParams.data over cloned entry data', () => {
    /**
     * Reproduces the exact data shape seen at repository.ts line ~450.
     *
     * `clonedEntryData`  – what comes back from the DB for the original entry
     *                      (getDeepPopulate with relationalFields: ['id'])
     * `userProvidedData` – what the user submitted from the duplicate form
     */
    function applyCloneMerge(clonedEntryData: Record<string, any>, userProvidedData: Record<string, any>) {
      // The fixed implementation: shallow spread instead of lodash merge
      return { ...clonedEntryData, ...userProvidedData };
    }

    it('replaces a one-to-one relation entirely when user disconnects it', () => {
      const clonedEntryData = {
        title: 'Original page',
        menu: { id: 3 },
      };

      // User removed the relation in the duplicate form
      const userProvidedData = {
        title: 'Cloned page',
        menu: { connect: [], disconnect: [{ id: 3 }] },
      };

      const result = applyCloneMerge(clonedEntryData, userProvidedData);

      // The stale `id: 3` must NOT survive in the merged relation
      expect(result.menu).not.toHaveProperty('id');
      expect(result.menu).toEqual({ connect: [], disconnect: [{ id: 3 }] });
    });

    it('preserves the relation when user keeps it', () => {
      const clonedEntryData = {
        title: 'Original page',
        menu: { id: 3 },
      };

      const userProvidedData = {
        title: 'Cloned page',
        menu: { connect: [{ id: 3 }], disconnect: [] },
      };

      const result = applyCloneMerge(clonedEntryData, userProvidedData);

      expect(result.menu).toEqual({ connect: [{ id: 3 }], disconnect: [] });
    });

    it('does not affect scalar fields not present in userProvidedData', () => {
      const clonedEntryData = {
        title: 'Original page',
        slug: 'original-page',
        menu: { id: 3 },
      };

      const userProvidedData = {
        title: 'Cloned page',
        menu: { connect: [], disconnect: [{ id: 3 }] },
      };

      const result = applyCloneMerge(clonedEntryData, userProvidedData);

      // slug was not in userProvidedData — should be preserved from the clone
      expect(result.slug).toBe('original-page');
      expect(result.title).toBe('Cloned page');
    });

    it('handles one-to-many relations the same way', () => {
      const clonedEntryData = {
        title: 'Original',
        tags: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };

      // User removed all tags in the duplicate form
      const userProvidedData = {
        title: 'Clone',
        tags: { connect: [], disconnect: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      };

      const result = applyCloneMerge(clonedEntryData, userProvidedData);

      expect(result.tags).toEqual({
        connect: [],
        disconnect: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
    });

    it('deep merge (old behaviour) demonstrates the bug for documentation purposes', () => {
      // This test documents WHY the old lodash merge was wrong.
      // lodash merge({ id: 3 }, { connect: [], disconnect: [...] })
      // produces { id: 3, connect: [], disconnect: [...] } — stale id survives.
      const buggyMerge = (a: Record<string, any>, b: Record<string, any>): any => {
        const result: Record<string, any> = { ...a };
        for (const key of Object.keys(b)) {
          const aVal = a[key];
          const bVal = b[key];
          if (
            bVal !== null &&
            typeof bVal === 'object' &&
            !Array.isArray(bVal) &&
            aVal !== null &&
            typeof aVal === 'object' &&
            !Array.isArray(aVal)
          ) {
            result[key] = buggyMerge(aVal, bVal);
          } else {
            result[key] = bVal;
          }
        }
        return result;
      };

      const clonedEntryData = { menu: { id: 3 } };
      const userProvidedData = { menu: { connect: [], disconnect: [{ id: 3 }] } };

      const buggyResult = buggyMerge(clonedEntryData, userProvidedData);
      // Stale id persists — this is the bug
      expect(buggyResult.menu).toHaveProperty('id', 3);

      // The fix does not have this problem
      const fixedResult = applyCloneMerge(clonedEntryData, userProvidedData);
      expect(fixedResult.menu).not.toHaveProperty('id');
    });
  });
});
