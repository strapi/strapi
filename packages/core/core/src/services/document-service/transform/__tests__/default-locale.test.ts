import { setDefaultLocaleToRelation } from '../relations/transform/default-locale';

describe('setDefaultLocaleToRelation', () => {
  it('sets the default locale on the relation and its position without mutating the input', () => {
    const relation = Object.freeze({
      documentId: 'a',
      position: Object.freeze({ before: 'b' }),
    });

    expect(setDefaultLocaleToRelation(relation, 'en')).toEqual({
      documentId: 'a',
      locale: 'en',
      position: { before: 'b', locale: 'en' },
    });
    expect(relation).toEqual({ documentId: 'a', position: { before: 'b' } });
  });

  it('keeps a locale already set on the position', () => {
    const relation = { documentId: 'a', position: { before: 'b', locale: 'fr' } };

    expect(setDefaultLocaleToRelation(relation, 'en')).toEqual({
      documentId: 'a',
      locale: 'en',
      position: { before: 'b', locale: 'fr' },
    });
  });

  it('does not add a position when the relation has none', () => {
    expect(setDefaultLocaleToRelation({ documentId: 'a' }, 'en')).toEqual({
      documentId: 'a',
      locale: 'en',
    });
  });
});
