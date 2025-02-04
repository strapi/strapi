import { initialState, reducer, actions } from '../reducer';

const mockCustomField = {
  type: 'string',
};

describe('CTB | components | FormModal | reducer | actions | SET_CUSTOM_FIELD_DATA_SCHEMA', () => {
  it('edits a custom field', () => {
    const expected = {
      ...initialState,
      initialData: {
        type: 'string',
        customField: 'plugin::color-picker.color',
        name: 'test',
      },
      modifiedData: {
        type: 'string',
        customField: 'plugin::color-picker.color',
        name: 'test',
      },
    };

    const action = actions.setCustomFieldDataSchema({
      isEditing: true,
      modifiedDataToSetForEditing: {
        type: 'string',
        customField: 'plugin::color-picker.color',
        name: 'test',
      },
    });

    expect(reducer(initialState, action)).toEqual(expected);
  });

  it('adds a custom field', () => {
    const action = actions.setCustomFieldDataSchema({
      customField: mockCustomField,
      isEditing: false,
      modifiedDataToSetForEditing: { name: null },
    });

    const expected = {
      ...initialState,
      modifiedData: {
        type: mockCustomField.type,
      },
    };

    expect(reducer(initialState, action)).toEqual(expected);
  });

  it("adds a custom field's default options", () => {
    const mockCustomFieldWithOptionsPath = {
      ...mockCustomField,
      options: {
        advanced: [
          {
            name: 'regex',
            type: 'text',
            defaultValue: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
          },
          {
            sectionTitle: {
              id: 'global.settings',
              defaultMessage: 'Settings',
            },
            items: [
              {
                name: 'required',
                type: 'checkbox',
                defaultValue: true,
              },
              {
                name: 'options.format',
                type: 'text',
                defaultValue: 'hex',
              },
            ],
          },
        ],
      },
    };

    const action = actions.setCustomFieldDataSchema({
      customField: mockCustomFieldWithOptionsPath,
      isEditing: false,
      modifiedDataToSetForEditing: { name: null },
    });

    const expected = {
      ...initialState,
      modifiedData: {
        type: mockCustomField.type,
        required: true,
        regex: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
        options: {
          format: 'hex',
        },
      },
    };

    expect(reducer(initialState, action)).toEqual(expected);
  });
});
