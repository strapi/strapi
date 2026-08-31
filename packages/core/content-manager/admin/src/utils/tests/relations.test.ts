import { getRelationLabel, getRelationThumbnail } from '../relations';

import type { RelationResult } from '../../../../shared/contracts/relations';
import type { MainField } from '../attributes';

const mainField = (name: string, type: MainField['type'] = 'string'): MainField => ({
  name,
  type,
});

describe('getRelationLabel', () => {
  it('returns the string main field value when present', () => {
    expect(
      getRelationLabel(
        { documentId: 'doc-1', id: 1, title: 'Issue 1' },
        mainField('title', 'string')
      )
    ).toBe('Issue 1');
  });

  it('returns a numeric main field value as a string', () => {
    expect(
      getRelationLabel(
        { documentId: 'doc-1', id: 1, pub_number: 42 },
        mainField('pub_number', 'integer')
      )
    ).toBe('42');
  });

  it('falls back to documentId when the main field value is missing', () => {
    expect(
      getRelationLabel({ documentId: 'doc-1', id: 1 }, mainField('pub_number', 'integer'))
    ).toBe('doc-1');
  });

  it('falls back to documentId when mainField is not provided', () => {
    expect(getRelationLabel({ documentId: 'doc-1', id: 1, pub_number: 42 })).toBe('doc-1');
  });

  it('falls back to documentId when the main field is id', () => {
    expect(getRelationLabel({ documentId: 'doc-1', id: 99 }, mainField('id', 'integer'))).toBe(
      'doc-1'
    );
  });

  it('falls back to documentId for numeric zero due to the truthiness check', () => {
    expect(
      getRelationLabel(
        { documentId: 'doc-1', id: 1, pub_number: 0 },
        mainField('pub_number', 'integer')
      )
    ).toBe('doc-1');
  });
});

describe('getRelationThumbnail', () => {
  it('should return undefined when mediaField is undefined', () => {
    const relation = { documentId: 'abc', id: 1 } as RelationResult;
    expect(getRelationThumbnail(relation, undefined)).toBeUndefined();
  });

  it('should return undefined when relation has no media value', () => {
    const relation = { documentId: 'abc', id: 1 } as RelationResult;
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
    } as RelationResult;

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
    } as RelationResult;

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
    } as RelationResult;

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
    } as RelationResult;

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
    } as RelationResult;

    expect(getRelationThumbnail(relation, { name: 'coverImage' })).toBeUndefined();
  });

  it('should return undefined for empty array media', () => {
    const relation = {
      documentId: 'abc',
      id: 1,
      coverImage: [],
    } as RelationResult;

    expect(getRelationThumbnail(relation, { name: 'coverImage' })).toBeUndefined();
  });

  it('should return undefined when the media object has no url', () => {
    const relation = {
      documentId: 'abc',
      id: 1,
      coverImage: { mime: 'image/jpeg', alternativeText: 'no url' },
    } as RelationResult;

    expect(getRelationThumbnail(relation, { name: 'coverImage' })).toBeUndefined();
  });

  it('should treat a null alternativeText as an empty alt', () => {
    const relation = {
      documentId: 'abc',
      id: 1,
      coverImage: { url: '/uploads/a.jpg', alternativeText: null, mime: 'image/jpeg' },
    } as RelationResult;

    expect(getRelationThumbnail(relation, { name: 'coverImage' })).toEqual({
      url: '/uploads/a.jpg',
      alt: '',
    });
  });
});
