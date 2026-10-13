import {
  composeAttributeRenames,
  rewriteContentManagerConfiguration,
} from '../attribute-renames';

const configuration = {
  settings: {
    mainField: 'internalName',
    defaultSortBy: 'internalName',
    pageSize: 10,
  },
  metadatas: {
    internalName: {
      edit: { label: 'internalName', visible: true },
      list: { label: 'internalName', searchable: true },
    },
    tagline: {
      edit: { label: 'Tagline', visible: true },
      list: { label: 'Tagline', searchable: true },
    },
    category: {
      edit: { label: 'category', mainField: 'title' },
      list: { label: 'category', mainField: 'title' },
    },
  },
  layouts: {
    list: ['id', 'internalName', 'tagline', 'price'],
    edit: [[{ name: 'internalName', size: 6 }], [{ name: 'tagline', size: 6 }]],
    editRelations: ['internalName'],
  },
  attributeRenames: { legacyName: 'internalName' },
};

describe('composeAttributeRenames', () => {
  it('chains a rename that happens before the browser opens the list', () => {
    expect(composeAttributeRenames({ legacyName: 'internalName' }, { internalName: 'productName' })).toEqual({
      legacyName: 'productName',
      internalName: 'productName',
    });
  });

  it('drops an entry once a field is renamed back to that name', () => {
    expect(composeAttributeRenames({ internalName: 'productName' }, { productName: 'internalName' })).toEqual({
      productName: 'internalName',
    });
  });
});

describe('rewriteContentManagerConfiguration', () => {
  const renames = { 'api::product.product': { internalName: 'productName' } };

  it('renames the saved column in place and keeps every other column', () => {
    const next = rewriteContentManagerConfiguration(configuration, {
      ownRenames: renames['api::product.product'],
      allRenames: renames,
    });

    expect(next?.layouts?.list).toEqual(['id', 'productName', 'tagline', 'price']);
    expect(next?.layouts?.edit).toEqual([[{ name: 'productName', size: 6 }], [{ name: 'tagline', size: 6 }]]);
    expect(next?.settings).toMatchObject({ mainField: 'productName', defaultSortBy: 'productName', pageSize: 10 });
    expect(next?.metadatas?.productName?.list).toMatchObject({ label: 'productName' });
    expect(next?.metadatas?.tagline?.list).toMatchObject({ label: 'Tagline' });
    expect(next?.metadatas?.internalName).toBeUndefined();
    expect(next?.attributeRenames).toEqual({
      legacyName: 'productName',
      internalName: 'productName',
    });
  });

  it('updates a relation display field when the target field is renamed', () => {
    const next = rewriteContentManagerConfiguration(
      {
        metadatas: {
          products: { edit: { mainField: 'internalName' }, list: { mainField: 'internalName' } },
        },
      },
      {
        attributes: {
          products: { type: 'relation', target: 'api::product.product' },
        },
        allRenames: renames,
      }
    );

    expect(next?.metadatas?.products?.edit?.mainField).toBe('productName');
    expect(next?.metadatas?.products?.list?.mainField).toBe('productName');
  });

  it('records the map when the model has no saved configuration yet', () => {
    expect(
      rewriteContentManagerConfiguration(null, {
        ownRenames: { internalName: 'productName' },
        allRenames: renames,
      })?.attributeRenames
    ).toEqual({ internalName: 'productName' });
  });

  it('does nothing for a model that was not part of the rename and has no configuration', () => {
    expect(rewriteContentManagerConfiguration(null, { allRenames: renames })).toBeNull();
  });
});
