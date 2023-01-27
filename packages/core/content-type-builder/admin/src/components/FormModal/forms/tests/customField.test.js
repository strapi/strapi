import * as yup from 'yup';
import forms from '..';
import ctbFormsAPI from '../../../../utils/formAPI';

const mockBaseCustomField = {
  name: 'color',
  pluginId: 'color-picker',
  type: 'string',
  icon: jest.fn(),
  intlLabel: {
    id: 'color-picker.label',
    defaultMessage: 'Color',
  },
  intlDescription: {
    id: 'color-picker.description',
    defaultMessage: 'Select any color',
  },
  components: {
    Input: jest.fn(),
  },
};

const mockNoSectionInput = [
  {
    intlLabel: {
      id: 'test',
      defaultMessage: 'Test',
    },
    name: 'regex',
    type: 'text',
    description: {
      id: 'test',
      defaultMessage: 'test',
    },
  },
];

const mockNewSectionInput = [
  {
    sectionTitle: {
      id: 'test',
      defaultMessage: 'Settings',
    },
    items: [
      {
        name: 'required',
        type: 'checkbox',
        intlLabel: {
          id: 'color-picker.options.advanced.requiredField',
          defaultMessage: 'Required field',
        },
        description: {
          id: 'color-picker.options.advanced.requiredField.description',
          defaultMessage: "You won't be able to create an entry if this field is empty",
        },
      },
    ],
  },
];

describe('customField forms', () => {
  describe('schema', () => {
    it('validates input using the provided validator', async () => {
      const mockArgs = {
        schemaAttributes: [
          {
            type: 'string',
            required: true,
            unique: true,
            configurable: true,
            name: 'type',
          },
        ],
        attributeType: 'string',
        reservedNames: {},
        customFieldValidator: () => ({
          test: yup.string().required(),
        }),
        schemaData: {
          modifiedData: {
            type: 'string',
            default: null,
            options: {
              test: 'option',
            },
          },
          initialData: {},
        },
        ctbFormsAPI,
      };
      const customFieldValidator = forms.customField.schema(mockArgs);
      const modifiedData = mockArgs.schemaData.modifiedData;
      const result = await customFieldValidator.validateAt('options.test', modifiedData);
      // If valid, yup returns the value
      expect(result).toBe(modifiedData.options.test);
    });
  });
  describe('base form', () => {
    it('adds to the default base form section', () => {
      const mockCustomField = {
        ...mockBaseCustomField,
        options: {
          base: mockNoSectionInput,
        },
      };

      const result = forms.customField.form.base({ customField: mockCustomField });

      const expected = [
        {
          sectionTitle: null,
          items: [
            {
              name: 'name',
              type: 'text',
              intlLabel: {
                id: 'global.name',
                defaultMessage: 'Name',
              },
              description: {
                id: 'content-type-builder.modalForm.attribute.form.base.name.description',
                defaultMessage: 'No space is allowed for the name of the attribute',
              },
            },
            {
              intlLabel: {
                id: 'test',
                defaultMessage: 'Test',
              },
              name: 'regex',
              type: 'text',
              description: {
                id: 'test',
                defaultMessage: 'test',
              },
            },
          ],
        },
      ];

      expect(result.sections.length).toBe(1);
      expect(result).toStrictEqual({ sections: expected });
    });

    it('adds a new base form section', () => {
      const mockCustomField = {
        ...mockBaseCustomField,
        options: {
          base: mockNewSectionInput,
        },
      };
      const result = forms.customField.form.base({ customField: mockCustomField });
      const expected = [
        {
          sectionTitle: null,
          items: [
            {
              name: 'name',
              type: 'text',
              intlLabel: {
                id: 'global.name',
                defaultMessage: 'Name',
              },
              description: {
                id: 'content-type-builder.modalForm.attribute.form.base.name.description',
                defaultMessage: 'No space is allowed for the name of the attribute',
              },
            },
          ],
        },
        {
          sectionTitle: {
            id: 'test',
            defaultMessage: 'Settings',
          },
          items: [
            {
              name: 'required',
              type: 'checkbox',
              intlLabel: {
                id: 'color-picker.options.advanced.requiredField',
                defaultMessage: 'Required field',
              },
              description: {
                id: 'color-picker.options.advanced.requiredField.description',
                defaultMessage: "You won't be able to create an entry if this field is empty",
              },
            },
          ],
        },
      ];

      expect(result.sections.length).toBe(2);
      expect(result).toStrictEqual({ sections: expected });
    });
  });
  describe('advanced form', () => {
    it('adds to the default advanced section', () => {
      const mockCustomField = {
        ...mockBaseCustomField,
        options: {
          advanced: mockNoSectionInput,
        },
      };
      const result = forms.customField.form.advanced({
        customField: mockCustomField,
        extensions: { getAdvancedForm: jest.fn() },
      });

      const expected = [
        {
          sectionTitle: null,
          items: [
            {
              intlLabel: {
                id: 'test',
                defaultMessage: 'Test',
              },
              name: 'regex',
              type: 'text',
              description: {
                id: 'test',
                defaultMessage: 'test',
              },
            },
          ],
        },
      ];

      expect(result.sections.length).toBe(1);
      expect(result).toStrictEqual({ sections: expected });
    });
    it('adds a new advanced form section', () => {
      const mockCustomField = {
        ...mockBaseCustomField,
        options: {
          advanced: mockNewSectionInput,
        },
      };

      const result = forms.customField.form.advanced({
        customField: mockCustomField,
        extensions: { getAdvancedForm: jest.fn() },
      });

      const expected = [
        {
          sectionTitle: null,
          items: [],
        },
        {
          sectionTitle: {
            id: 'test',
            defaultMessage: 'Settings',
          },
          items: [
            {
              name: 'required',
              type: 'checkbox',
              intlLabel: {
                id: 'color-picker.options.advanced.requiredField',
                defaultMessage: 'Required field',
              },
              description: {
                id: 'color-picker.options.advanced.requiredField.description',
                defaultMessage: "You won't be able to create an entry if this field is empty",
              },
            },
          ],
        },
      ];

      expect(result.sections.length).toBe(2);
      expect(result).toStrictEqual({ sections: expected });
    });

    it('injects inputs from other plugins', () => {
      const mockCustomField = {
        ...mockBaseCustomField,
        options: {
          base: [],
          advanced: [],
        },
      };
      const result = forms.customField.form.advanced({
        customField: mockCustomField,
        extensions: {
          getAdvancedForm: jest.fn(() => [
            {
              name: 'pluginOptions.i18n.localized',
              description: {
                id: 'i18n.plugin.schema.i18n.localized.description-field',
                defaultMessage: 'The field can have different values in each locale',
              },
              type: 'checkbox',
              intlLabel: {
                id: 'i18n.plugin.schema.i18n.localized.label-field',
                defaultMessage: 'Enable localization for this field',
              },
            },
          ]),
        },
      });

      const expected = [
        {
          sectionTitle: null,
          items: [],
        },
        {
          sectionTitle: {
            id: 'content-type-builder.modalForm.custom-fields.advanced.settings.extended',
            defaultMessage: 'Extended settings',
          },
          items: [
            {
              name: 'pluginOptions.i18n.localized',
              description: {
                id: 'i18n.plugin.schema.i18n.localized.description-field',
                defaultMessage: 'The field can have different values in each locale',
              },
              type: 'checkbox',
              intlLabel: {
                id: 'i18n.plugin.schema.i18n.localized.label-field',
                defaultMessage: 'Enable localization for this field',
              },
            },
          ],
        },
      ];

      expect(result.sections.length).toBe(2);
      expect(result).toStrictEqual({ sections: expected });
    });
  });
});
