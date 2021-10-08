import React from 'react';
import { FormattedMessage } from 'react-intl';
import isEmpty from 'lodash/isEmpty';
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
              type: 'enum',
              label: {
                id: getTrad('form.attribute.settings.default'),
              },
              name: 'default',
              options: [
                { value: 'true', label: 'TRUE' },
                { value: '', label: 'NULL' },
                { value: 'false', label: 'FALSE' },
              ],
              // validations: {},
            },
          ],
        },
        { sectionTitle: null, items: [options.required, options.unique, options.private] },
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
            sectionTitle: null,
            items: [options.required, options.private, options.max, options.min],
          },
        ],
      };
    }

    return {
      sections: [{ sectionTitle: null, items: [options.required, options.private] }],
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
        { sectionTitle: null, items: [options.required, options.unique, options.private] },
      ],
    };
  },
  dynamiczone: () => {
    return {
      sections: [{ sectionTitle: null, items: [options.required, options.max, options.min] }],
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
          sectionTitle: null,
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
              label: {
                id: getTrad('form.attribute.settings.default'),
              },
              validations: {},
              options: [
                <FormattedMessage
                  key="hidden___value__placeholder"
                  id="components.InputSelect.option.placeholder"
                >
                  {msg => <option value="">{msg}</option>}
                </FormattedMessage>,
              ].concat(
                data.enum
                  ? data.enum
                      .filter((val, index) => data.enum.indexOf(val) === index && !isEmpty(val))
                      .map(val => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))
                  : []
              ),
            },
            {
              label: {
                id: getTrad('form.attribute.item.enumeration.graphql'),
              },
              name: 'enumName',
              type: 'text',
              validations: {},
              description: {
                id: getTrad('form.attribute.item.enumeration.graphql.description'),
              },
            },
          ],
        },

        { sectionTitle: null, items: [options.required, options.unique, options.private] },
      ],
    };
  },
  json: () => {
    return {
      sections: [
        { sectionTitle: null, items: [options.required, options.unique, options.private] },
      ],
    };
  },
  media: () => {
    return {
      sections: [
        { sectionTitle: null, items: [options.required, options.unique] },
        {
          sectionTitle: null,
          items: [
            {
              label: {
                id: getTrad('form.attribute.media.allowed-types'),
              },
              name: 'allowedTypes',
              type: 'allowedTypesSelect',
              value: '',
              validations: {},
            },
            options.private,
          ],
        },
      ],
    };
  },
  number: data => {
    const inputStep = data.type === 'decimal' || data.type === 'float' ? 'any' : '1';

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
              label: {
                id: getTrad('form.attribute.settings.default'),
              },
              validations: {},
            },
          ],
        },
        {
          sectionTitle: null,
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
          sectionTitle: null,
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
  relation: () => {
    return {
      sections: [{ sectionTitle: null, items: [options.private] }],
    };
  },
  richtext: () => {
    return {
      sections: [
        { sectionTitle: null, items: [options.default] },
        {
          sectionTitle: null,
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
  text: () => {
    return {
      sections: [
        { sectionTitle: null, items: [options.default, options.regex] },

        {
          sectionTitle: null,
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
          sectionTitle: null,
          items: [options.required, options.maxLength, options.minLength, options.private],
        },
      ],
    };
  },
};

export default advancedForm;
