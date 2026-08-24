import { getRelationLabel } from '../relations';

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
