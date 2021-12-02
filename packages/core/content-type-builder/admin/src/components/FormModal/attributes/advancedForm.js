// import React from 'react';
// import { FormattedMessage } from 'react-intl';
// import isEmpty from 'lodash/isEmpty';
import getTrad from '../../../utils/getTrad';
import { componentForm } from '../component';
import options from './attributeOptions';

const advancedForm = {
  boolean: () => {
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
              // validations: {},
            },
          ],
        },
        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.private],
        },
      ],
    };
  },
  component: ({ repeatable }, step) => {
    if (step === '1') {
      return { sections: componentForm.advanced('componentToCreate') };
    }

    if (repeatable) {
      return {
        sections: [
          {
            sectionTitle: {
              id: getTrad('form.attribute.item.settings.name'),
              defaultMessage: 'Settings',
            },
            items: [options.required, options.private, options.max, options.min],
          },
        ],
      };
    }

    return {
      sections: [
        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.private],
        },
      ],
    };
  },
  date: ({ type }) => {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              ...options.default,
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
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.unique, options.private],
        },
      ],
    };
  },
  dynamiczone: () => {
    return {
      sections: [
        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.max, options.min],
        },
      ],
    };
  },
  email: () => {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              ...options.default,
              type: 'email',
            },
          ],
        },

        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [
            options.required,
            options.unique,
            options.maxLength,
            options.minLength,
            options.private,
          ],
        },
      ],
    };
  },
  enumeration: data => {
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
                  .map(value => {
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
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.private],
        },
      ],
    };
  },
  json: () => {
    return {
      sections: [
        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.private],
        },
      ],
    };
  },
  media: () => {
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
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.private, options.required],
        },
      ],
    };
  },
  number: data => {
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
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.unique, options.max, options.min, options.private],
        },
      ],
    };
  },
  password: () => {
    return {
      sections: [
        { sectionTitle: null, items: [options.default] },

        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.maxLength, options.minLength, options.private],
        },
      ],
    };
  },
  relation: () => {
    return {
      sections: [
        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.private],
        },
      ],
    };
  },
  richtext: () => {
    return {
      sections: [
        { sectionTitle: null, items: [options.default] },
        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.maxLength, options.minLength, options.private],
        },
      ],
    };
  },
  text: () => {
    return {
      sections: [
        { sectionTitle: null, items: [options.default, options.regex] },

        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [
            options.required,
            options.unique,
            options.maxLength,
            options.minLength,
            options.private,
          ],
        },
      ],
    };
  },
  uid: data => {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [{ ...options.default, disabled: Boolean(data.targetField), type: 'text' }],
        },

        {
          sectionTitle: {
            id: getTrad('form.attribute.item.settings.name'),
            defaultMessage: 'Settings',
          },
          items: [options.required, options.maxLength, options.minLength, options.private],
        },
      ],
    };
  },
};

export default advancedForm;
