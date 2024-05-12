import { getTrad } from '../../../utils/getTrad';
import { componentForm } from '../component/componentForm';

import { attributeOptions } from './attributeOptions';

type DataType = 'biginteger' | 'string' | 'integer' | 'float' | 'decimal';

export const advancedForm = {
  blocks() {
    return {
      sections: [
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [attributeOptions.required, attributeOptions.private],
        },
      ],
    };
  },
  boolean() {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              autoFocus: true,
              type: 'select-default-boolean',
              intlLabel: {
                id: getTrad('form.attribute.settings.default'),
                defaultMessage: 'Default value',
              },
              name: 'default',
              options: [
                {
                  value: 'true',
                  key: 'true',
                  metadatas: { intlLabel: { id: 'true', defaultMessage: 'true' } },
                },
                {
                  value: '',
                  key: 'null',
                  metadatas: { intlLabel: { id: 'null', defaultMessage: 'null' } },
                },
                {
                  value: 'false',
                  key: 'false',
                  metadatas: { intlLabel: { id: 'false', defaultMessage: 'false' } },
                },
              ],
            },
          ],
        },
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [attributeOptions.required, attributeOptions.private],
        },
      ],
    };
  },
  component({ repeatable }: { repeatable: boolean }, step: string) {
    if (step === '1') {
      return { sections: componentForm.advanced() };
    }

    if (repeatable) {
      return {
        sections: [
          {
            sectionTitle: {
              id: 'global.settings',
              defaultMessage: 'Settings',
            },
            items: [
              attributeOptions.required,
              attributeOptions.private,
              attributeOptions.max,
              attributeOptions.min,
            ],
          },
        ],
      };
    }

    return {
      sections: [
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [attributeOptions.required, attributeOptions.private],
        },
      ],
    };
  },
  date({ type }: { type: string }) {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              ...attributeOptions.default,
              type: type || 'date',
              value: null,
              withDefaultValue: false,
              disabled: !type,
              autoFocus: false,
            },
          ],
        },
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [attributeOptions.required, attributeOptions.unique, attributeOptions.private],
        },
      ],
    };
  },
  dynamiczone() {
    return {
      sections: [
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [attributeOptions.required, attributeOptions.max, attributeOptions.min],
        },
      ],
    };
  },
  email() {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              ...attributeOptions.default,
              type: 'email',
            },
          ],
        },

        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [
            attributeOptions.required,
            attributeOptions.unique,
            attributeOptions.maxLength,
            attributeOptions.minLength,
            attributeOptions.private,
          ],
        },
      ],
    };
  },
  enumeration(data: { enum: Array<string> }) {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              name: 'default',
              type: 'select',
              intlLabel: {
                id: getTrad('form.attribute.settings.default'),
                defaultMessage: 'Default value',
              },
              validations: {},
              options: [
                {
                  key: '__null_reset_value__',
                  value: '',
                  metadatas: {
                    intlLabel: {
                      id: 'components.InputSelect.option.placeholder',
                      defaultMessage: 'Choose here',
                    },
                  },
                },
                ...(data.enum || [])
                  .filter((value, index) => data.enum.indexOf(value) === index && value)
                  .map((value) => {
                    return {
                      key: value,
                      value,
                      metadatas: {
                        intlLabel: { id: `${value}.no-override`, defaultMessage: value },
                      },
                    };
                  }),
              ],
            },
            {
              intlLabel: {
                id: getTrad('form.attribute.item.enumeration.graphql'),
                defaultMessage: 'Name override for GraphQL',
              },
              name: 'enumName',
              type: 'text',
              validations: {},
              description: {
                id: getTrad('form.attribute.item.enumeration.graphql.description'),
                defaultMessage: 'Allows you to override the default generated name for GraphQL',
              },
            },
          ],
        },

        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [attributeOptions.required, attributeOptions.private],
        },
      ],
    };
  },
  json() {
    return {
      sections: [
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [attributeOptions.required, attributeOptions.private],
        },
      ],
    };
  },
  media() {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              intlLabel: {
                id: getTrad('form.attribute.media.allowed-types'),
                defaultMessage: 'Select allowed types of media',
              },
              name: 'allowedTypes',
              type: 'allowed-types-select',
              size: 7,
              value: '',
              validations: {},
            },
          ],
        },
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [attributeOptions.required, attributeOptions.private],
        },
      ],
    };
  },
  number(data: { type: DataType }) {
    const inputStep = data.type === 'decimal' || data.type === 'float' ? 'any' : 1;

    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              autoFocus: true,
              name: 'default',
              type: data.type === 'biginteger' ? 'text' : 'number',
              step: inputStep,
              intlLabel: {
                id: getTrad('form.attribute.settings.default'),
                defaultMessage: 'Default value',
              },
              validations: {},
            },
          ],
        },
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [
            attributeOptions.required,
            attributeOptions.unique,
            attributeOptions.max,
            attributeOptions.min,
            attributeOptions.private,
          ],
        },
      ],
    };
  },
  password() {
    return {
      sections: [
        { sectionTitle: null, items: [attributeOptions.default] },

        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [
            attributeOptions.required,
            attributeOptions.maxLength,
            attributeOptions.minLength,
            attributeOptions.private,
          ],
        },
      ],
    };
  },
  relation() {
    return {
      sections: [
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [attributeOptions.private],
        },
      ],
    };
  },
  richtext() {
    return {
      sections: [
        { sectionTitle: null, items: [attributeOptions.default] },
        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [
            attributeOptions.required,
            attributeOptions.maxLength,
            attributeOptions.minLength,
            attributeOptions.private,
          ],
        },
      ],
    };
  },
  text() {
    return {
      sections: [
        { sectionTitle: null, items: [attributeOptions.default, attributeOptions.regex] },

        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [
            attributeOptions.required,
            attributeOptions.unique,
            attributeOptions.maxLength,
            attributeOptions.minLength,
            attributeOptions.private,
          ],
        },
      ],
    };
  },
  uid(data: { targetField: string }) {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            { ...attributeOptions.default, disabled: Boolean(data.targetField), type: 'text' },
          ],
        },

        {
          sectionTitle: {
            id: 'global.settings',
            defaultMessage: 'Settings',
          },
          items: [
            attributeOptions.required,
            attributeOptions.maxLength,
            attributeOptions.minLength,
            attributeOptions.private,
          ],
        },
      ],
    };
  },
};
