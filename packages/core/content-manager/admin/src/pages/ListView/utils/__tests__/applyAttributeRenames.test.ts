import {
  applyAttributeRenamesToFilters,
  applyAttributeRenamesToHeaders,
  applyAttributeRenamesToSort,
} from '../applyAttributeRenames';

const attributes = { productName: { type: 'string' }, price: { type: 'decimal' } };
const renames = { internalName: 'productName', legacyName: 'productName' };

describe('applyAttributeRenamesToHeaders', () => {
  it('replaces a renamed column and keeps the rest of the selection', () => {
    expect(
      applyAttributeRenamesToHeaders(
        ['id', 'internalName', 'price'],
        { ...attributes, id: {} },
        renames
      )
    ).toEqual(['id', 'productName', 'price']);
  });

  it('drops a deleted column and collapses a rename onto a column already shown', () => {
    expect(
      applyAttributeRenamesToHeaders(['productName', 'internalName', 'gone'], attributes, renames)
    ).toEqual(['productName']);
  });

  it('does not rewrite a current field just because an old map mentions that name', () => {
    expect(
      applyAttributeRenamesToHeaders(
        ['internalName'],
        { internalName: { type: 'string' } },
        renames
      )
    ).toEqual(['internalName']);
  });
});

describe('saved list query', () => {
  it('keeps a sort entry that is not a renamed field', () => {
    expect(applyAttributeRenamesToSort('price,gone:DESC', attributes, renames)).toBe(
      'price,gone:DESC'
    );
    expect(applyAttributeRenamesToFilters(null, attributes, renames)).toBeNull();
  });

  it('renames the sort field and a filter key', () => {
    expect(applyAttributeRenamesToSort('internalName:ASC', attributes, renames)).toBe(
      'productName:ASC'
    );
    expect(
      applyAttributeRenamesToFilters(
        { $and: [{ internalName: { $contains: 'Cloud' } }, { price: { $gt: 10 } }] },
        attributes,
        renames
      )
    ).toEqual({ $and: [{ productName: { $contains: 'Cloud' } }, { price: { $gt: 10 } }] });
  });

  it('keeps a filter key that is neither a current attribute nor a rename', () => {
    expect(
      applyAttributeRenamesToFilters({ gone: { $eq: 'x' }, _q: 'cloud' }, attributes, renames)
    ).toEqual({ gone: { $eq: 'x' }, _q: 'cloud' });
  });

  it('does not rewrite a nested field with the parent content-type map', () => {
    expect(
      applyAttributeRenamesToFilters(
        {
          $and: [
            { category: { internalName: { $eq: 'News' } } },
            { internalName: { $contains: 'Cloud' } },
          ],
        },
        { ...attributes, category: { type: 'relation' } },
        renames
      )
    ).toEqual({
      $and: [
        { category: { internalName: { $eq: 'News' } } },
        { productName: { $contains: 'Cloud' } },
      ],
    });
  });
});
