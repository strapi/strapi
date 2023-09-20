import addItemsToFormSections from '../addItemsToFormSection';

describe('addItemsToFormSection', () => {
  it('adds items to the default section', () => {
    const sections = [{ sectionTitle: null, items: [] }];
    const itemsToAdd = [
      {
        intlLabel: {
          id: 'color-picker.color.format.label',
          defaultMessage: 'Color format',
        },
        name: 'options.color-picker.format',
        type: 'select',
        value: 'hex',
        options: [
          {
            key: 'hex',
            value: 'hex',
            metadatas: {
              intlLabel: {
                id: 'color-picker.color.format.hex',
                defaultMessage: 'Hexadecimal',
              },
            },
          },
          {
            key: 'rgba',
            value: 'rgba',
            metadatas: {
              intlLabel: {
                id: 'color-picker.color.format.rgba',
                defaultMessage: 'RGBA',
              },
            },
          },
        ],
      },
    ];

    addItemsToFormSections(itemsToAdd, sections);

    expect(sections.length).toBe(1);
    expect(sections[0].items.length).toBe(1);
  });

  it('adds the item as a new section', () => {
    const sections = [{ sectionTitle: null, items: [] }];
    const itemsToAdd = [
      {
        sectionTitle: null,
        items: [
          {
            intlLabel: {
              id: 'color-picker.color.format.label',
              defaultMessage: 'Color format',
            },
            name: 'options.color-picker.format',
            type: 'select',
            value: 'hex',
            options: [
              {
                key: 'hex',
                value: 'hex',
                metadatas: {
                  intlLabel: {
                    id: 'color-picker.color.format.hex',
                    defaultMessage: 'Hexadecimal',
                  },
                },
              },
              {
                key: 'rgba',
                value: 'rgba',
                metadatas: {
                  intlLabel: {
                    id: 'color-picker.color.format.rgba',
                    defaultMessage: 'RGBA',
                  },
                },
              },
            ],
          },
        ],
      },
    ];

    addItemsToFormSections(itemsToAdd, sections);

    expect(sections.length).toBe(2);
  });
});
