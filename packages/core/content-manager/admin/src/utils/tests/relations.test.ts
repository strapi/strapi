import { getRelationLabel, getRelationThumbnail } from '../relations';

describe('relations', () => {
  describe('getRelationThumbnail', () => {
    it('should return undefined when mediaField is undefined', () => {
      const relation = { documentId: 'abc', id: 1 } as any;
      expect(getRelationThumbnail(relation, undefined)).toBeUndefined();
    });

    it('should return undefined when relation has no media value', () => {
      const relation = { documentId: 'abc', id: 1 } as any;
      expect(getRelationThumbnail(relation, { name: 'coverImage' })).toBeUndefined();
    });

    it('should return thumbnail for image media', () => {
      const relation = {
        documentId: 'abc',
        id: 1,
        coverImage: {
          url: '/uploads/image.jpg',
          alternativeText: 'A product',
          mime: 'image/jpeg',
          formats: {
            thumbnail: { url: '/uploads/thumbnail_image.jpg' },
          },
        },
      } as any;

      const result = getRelationThumbnail(relation, { name: 'coverImage' });
      expect(result).toEqual({
        url: '/uploads/thumbnail_image.jpg',
        alt: 'A product',
      });
    });

    it('should fall back to main url when no thumbnail format', () => {
      const relation = {
        documentId: 'abc',
        id: 1,
        coverImage: {
          url: '/uploads/image.jpg',
          alternativeText: '',
          mime: 'image/png',
          formats: {},
        },
      } as any;

      const result = getRelationThumbnail(relation, { name: 'coverImage' });
      expect(result).toEqual({
        url: '/uploads/image.jpg',
        alt: '',
      });
    });

    it('should return undefined for non-image media (PDF)', () => {
      const relation = {
        documentId: 'abc',
        id: 1,
        coverImage: {
          url: '/uploads/doc.pdf',
          alternativeText: 'A document',
          mime: 'application/pdf',
          formats: {},
        },
      } as any;

      expect(getRelationThumbnail(relation, { name: 'coverImage' })).toBeUndefined();
    });

    it('should use first item for array media (multiple=true)', () => {
      const relation = {
        documentId: 'abc',
        id: 1,
        coverImage: [
          {
            url: '/uploads/first.jpg',
            alternativeText: 'First',
            mime: 'image/jpeg',
            formats: {},
          },
          {
            url: '/uploads/second.jpg',
            alternativeText: 'Second',
            mime: 'image/jpeg',
            formats: {},
          },
        ],
      } as any;

      const result = getRelationThumbnail(relation, { name: 'coverImage' });
      expect(result).toEqual({
        url: '/uploads/first.jpg',
        alt: 'First',
      });
    });

    it('should return undefined when media value is not an object', () => {
      const relation = {
        documentId: 'abc',
        id: 1,
        coverImage: 'not-an-object',
      } as any;

      expect(getRelationThumbnail(relation, { name: 'coverImage' })).toBeUndefined();
    });

    it('should return undefined for empty array media', () => {
      const relation = {
        documentId: 'abc',
        id: 1,
        coverImage: [],
      } as any;

      expect(getRelationThumbnail(relation, { name: 'coverImage' })).toBeUndefined();
    });
  });

  describe('getRelationLabel', () => {
    it('should return mainField value when available', () => {
      const relation = { documentId: 'abc', id: 1, title: 'My Title' } as any;
      expect(getRelationLabel(relation, { name: 'title', type: 'string' })).toBe('My Title');
    });

    it('should fall back to documentId', () => {
      const relation = { documentId: 'abc', id: 1 } as any;
      expect(getRelationLabel(relation, { name: 'title', type: 'string' })).toBe('abc');
    });
  });
});
