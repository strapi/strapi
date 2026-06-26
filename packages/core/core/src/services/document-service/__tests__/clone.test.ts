// Regression coverage for https://github.com/strapi/strapi/issues/25749.

import { mergeCloneData } from '../repository';

describe('mergeCloneData', () => {
  describe('relation operations (bug #25749)', () => {
    it('replaces a one-to-one relation entirely when the user disconnects it', () => {
      const cloned = { title: 'Original page', menu: { id: 3 } };
      const user = {
        title: 'Cloned page',
        menu: { connect: [], disconnect: [{ id: 3 }] },
      };

      const result = mergeCloneData(cloned, user);

      expect(result.menu).not.toHaveProperty('id');
      expect(result.menu).toEqual({ connect: [], disconnect: [{ id: 3 }] });
      expect(result.title).toBe('Cloned page');
    });

    it('preserves the relation when the user keeps it', () => {
      const cloned = { title: 'Original page', menu: { id: 3 } };
      const user = { menu: { connect: [{ id: 3 }], disconnect: [] } };

      const result = mergeCloneData(cloned, user);

      expect(result.menu).toEqual({ connect: [{ id: 3 }], disconnect: [] });
    });

    it('handles one-to-many disconnects the same way', () => {
      const cloned = {
        title: 'Original',
        tags: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };
      const user = {
        tags: { connect: [], disconnect: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      };

      const result = mergeCloneData(cloned, user);

      expect(result.tags).toEqual({
        connect: [],
        disconnect: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
    });

    it('handles the `set` operator the same way as connect/disconnect', () => {
      const cloned = { menu: { id: 3 } };
      const user = { menu: { set: [{ id: 5 }] } };

      const result = mergeCloneData(cloned, user);

      expect(result.menu).toEqual({ set: [{ id: 5 }] });
      expect(result.menu).not.toHaveProperty('id');
    });
  });

  describe('non-relation fields keep deep-merge semantics', () => {
    it('deep-merges partial component data (existing behavior)', () => {
      const cloned = {
        title: 'Original',
        seo: { id: 7, metaTitle: 'old', metaDescription: 'old desc' },
      };
      const user = { seo: { metaTitle: 'new' } };

      const result = mergeCloneData(cloned, user);

      expect(result.seo).toEqual({
        id: 7,
        metaTitle: 'new',
        metaDescription: 'old desc',
      });
    });

    it('deep-merges partial JSON-like data (existing behavior)', () => {
      const cloned = { config: { a: 1, b: 2, nested: { x: 1 } } };
      const user = { config: { a: 3, nested: { y: 2 } } };

      const result = mergeCloneData(cloned, user);

      expect(result.config).toEqual({
        a: 3,
        b: 2,
        nested: { x: 1, y: 2 },
      });
    });

    it('replaces scalar fields supplied by the user', () => {
      const cloned = { title: 'Original page', slug: 'original-page' };
      const user = { title: 'Cloned page' };

      const result = mergeCloneData(cloned, user);

      expect(result.title).toBe('Cloned page');
      expect(result.slug).toBe('original-page');
    });
  });

  describe('mixed payloads', () => {
    it('replaces relation ops and deep-merges components in the same call', () => {
      const cloned = {
        title: 'Original',
        menu: { id: 3 },
        seo: { id: 7, metaTitle: 'old', metaDescription: 'old desc' },
      };
      const user = {
        title: 'Cloned',
        menu: { connect: [], disconnect: [{ id: 3 }] },
        seo: { metaTitle: 'new' },
      };

      const result = mergeCloneData(cloned, user);

      expect(result.menu).toEqual({ connect: [], disconnect: [{ id: 3 }] });
      expect(result.seo).toEqual({
        id: 7,
        metaTitle: 'new',
        metaDescription: 'old desc',
      });
      expect(result.title).toBe('Cloned');
    });
  });

  describe('defensive cases', () => {
    it('returns a shallow copy of the cloned data when user data is undefined', () => {
      const cloned = { title: 'Original', menu: { id: 3 } };

      const result = mergeCloneData(cloned, undefined);

      expect(result).toEqual(cloned);
      expect(result).not.toBe(cloned);
    });

    it('does not mutate either input', () => {
      const cloned = { title: 'Original', menu: { id: 3 } };
      const user = { menu: { connect: [], disconnect: [{ id: 3 }] } };
      const clonedSnapshot = JSON.parse(JSON.stringify(cloned));
      const userSnapshot = JSON.parse(JSON.stringify(user));

      mergeCloneData(cloned, user);

      expect(cloned).toEqual(clonedSnapshot);
      expect(user).toEqual(userSnapshot);
    });
  });
});
