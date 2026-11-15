import { CustomFields, type CustomField } from '../CustomFields';

describe('CustomFields', () => {
  it('accepts the textarea-enum option input type registered by the Content-Type Builder', () => {
    const customFields = new CustomFields();

    const customField: CustomField = {
      name: 'color',
      pluginId: 'color-picker',
      type: 'string',
      intlLabel: { id: 'color-picker.label', defaultMessage: 'Color' },
      intlDescription: { id: 'color-picker.description', defaultMessage: 'Select a color' },
      components: {
        Input: () => Promise.resolve({ default: () => null }),
      },
      options: {
        base: [
          {
            intlLabel: { id: 'color-picker.enum.label', defaultMessage: 'Values' },
            description: { id: 'color-picker.enum.description', defaultMessage: 'One per line' },
            name: 'enum',
            type: 'textarea-enum',
          },
        ],
      },
    };

    customFields.register(customField);

    expect(customFields.get('plugin::color-picker.color')?.options?.base).toEqual([
      expect.objectContaining({ name: 'enum', type: 'textarea-enum' }),
    ]);
  });
});
