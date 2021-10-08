// import React, { Fragment } from 'react';
// import { FormattedMessage } from 'react-intl';
import getTrad from '../../../utils/getTrad';
import { componentField, componentForm } from '../component';
import { nameField } from './nameField';

const baseForm = {
  component: (data, step) => {
    if (step === '1') {
      const itemsToConcat =
        data.createComponent === true ? componentForm.base('componentToCreate.') : [];

      return {
        sections: [{ sectionTitle: null, items: [componentField] }, ...itemsToConcat],
      };
    }

    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            nameField,
            {
              name: 'component',
              type: 'componentSelect',
              intlLabel: {
                id: getTrad('modalForm.attributes.select-component'),
                defaultMessage: 'Select a component',
              },
              isMultiple: false,
            },
          ],
        },
        {
          sectionTitle: null,
          items: [
            {
              intlLabel: {
                id: getTrad('modalForm.attribute.text.type-selection'),
                defaultMessage: 'Type',
              },
              name: 'repeatable',
              type: 'booleanBox',
              size: 12,
              // FIXME
              // options: [
              //   {
              //     headerId: getTrad('form.attribute.component.option.repeatable'),
              //     descriptionId: getTrad('form.attribute.component.option.repeatable.description'),
              //     value: true,
              //   },
              //   {
              //     headerId: getTrad('form.attribute.component.option.single'),
              //     descriptionId: getTrad('form.attribute.component.option.single.description'),
              //     value: false,
              //   },
              // ],
              // validations: {},
            },
          ],
        },
      ],
    };
  },
  date: () => {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            nameField,
            {
              intlLabel: {
                id: getTrad('modalForm.attribute.text.type-selection'),
                defaultMessage: 'Type',
              },
              name: 'type',
              type: 'select',
              options: [
                {
                  key: '__null_reset_value__',
                  value: '',
                  metadatas: {
                    intlLabel: {
                      id: 'components.InputSelect.option.placeholder',
                      defaultMessage: 'Choose here',
                    },
                    hidden: true,
                  },
                },
                {
                  key: 'date',
                  value: 'date',
                  metadatas: {
                    intlLabel: {
                      id: getTrad('form.attribute.item.date.type.date'),
                      defaultMessage: 'date',
                    },
                  },
                },
                {
                  key: 'datetime',
                  value: 'datetime',
                  metadatas: {
                    intlLabel: {
                      id: getTrad('form.attribute.item.date.type.datetime'),
                      defaultMessage: 'datetime',
                    },
                  },
                },
                {
                  key: 'time',
                  value: 'time',
                  metadatas: {
                    intlLabel: {
                      id: getTrad('form.attribute.item.date.type.time'),
                      defaultMessage: 'time',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  },
  enumeration: () => {
    return {
      sections: [
        { sectionTitle: null, items: [nameField] },
        {
          sectionTitle: null,
          items: [
            {
              name: 'enum',
              type: 'textarea',
              size: 8,
              intlLabel: {
                id: getTrad('form.attribute.item.enumeration.rules'),
                defaultMessage: 'Values (one line per value)',
              },
              placeholder: {
                id: getTrad('form.attribute.item.enumeration.placeholder'),
                defaultMessage: 'Ex:\nmorning\nnoon\nevening',
              },
              validations: {
                required: true,
              },
            },
          ],
        },
      ],
    };
  },
  media: () => {
    return {
      sections: [
        { sectionTitle: null, items: [nameField] },
        {
          sectionTitle: null,
          items: [
            {
              intlLabel: {
                id: getTrad('modalForm.attribute.text.type-selection'),
                defaultMessage: 'Type',
              },
              name: 'multiple',
              size: 12,
              type: 'booleanBox',
              // FIXME
              options: [],
              // options: [
              //   {
              //     headerId: getTrad('form.attribute.media.option.multiple'),
              //     descriptionId: getTrad('form.attribute.media.option.multiple.description'),
              //     value: true,
              //   },
              //   {
              //     headerId: getTrad('form.attribute.media.option.single'),
              //     descriptionId: getTrad('form.attribute.media.option.single.description'),
              //     value: false,
              //   },
              // ],
              // validations: {},
            },
          ],
        },
      ],
    };
  },
  number: () => {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            nameField,
            {
              intlLabel: {
                id: getTrad('form.attribute.item.number.type'),
                defaultMessage: 'Number format',
              },
              name: 'type',
              type: 'select',
              options: [
                {
                  key: '__null_reset_value__',
                  value: '',
                  metadatas: {
                    intlLabel: {
                      id: 'components.InputSelect.option.placeholder',
                      defaultMessage: 'Choose here',
                    },
                    hidden: true,
                  },
                },
                {
                  key: 'integer',
                  value: 'integer',
                  metadatas: {
                    intlLabel: {
                      id: getTrad('form.attribute.item.number.type.integer'),
                      defaultMessage: 'integer (ex: 10)',
                    },
                  },
                },
                {
                  key: 'biginteger',
                  value: 'biginteger',
                  metadatas: {
                    intlLabel: {
                      id: getTrad('form.attribute.item.number.type.biginteger'),
                      defaultMessage: 'biginteger (ex: 123456789)',
                    },
                  },
                },
                {
                  key: 'decimal',
                  value: 'decimal',
                  metadatas: {
                    intlLabel: {
                      id: getTrad('form.attribute.item.number.type.decimal'),
                      defaultMessage: 'decimal (ex: 2.22)',
                    },
                  },
                },
                {
                  key: 'float',
                  value: 'float',
                  metadatas: {
                    intlLabel: {
                      id: getTrad('form.attribute.item.number.type.float'),
                      defaultMessage: 'decimal (ex: 3.3333333)',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  },
  relation: () => {
    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              intlLabel: { id: 'FIXME', defaultMessage: 'FIXME' },
              name: 'relation',
              type: 'relation',
            },
          ],
        },
      ],
    };
  },
  string: () => {
    return {
      sections: [
        { sectionTitle: null, items: [nameField] },
        {
          sectionTitle: null,
          items: [
            {
              intlLabel: {
                id: getTrad('modalForm.attribute.text.type-selection'),
                defaultMessage: 'Type',
              },
              name: 'type',
              size: 12,
              type: 'booleanBox',
              options: [],
              // FIXME
              // options: [
              //   {
              //     headerId: getTrad('form.attribute.text.option.short-text'),
              //     descriptionId: getTrad('form.attribute.text.option.short-text.description'),
              //     value: 'string',
              //   },
              //   {
              //     headerId: getTrad('form.attribute.text.option.long-text'),
              //     descriptionId: getTrad('form.attribute.text.option.long-text.description'),
              //     value: 'text',
              //   },
              // ],
              // validations: {},
            },
          ],
        },
      ],
    };
  },
  text: () => {
    return {
      sections: [
        { sectionTitle: null, items: [nameField] },
        {
          sectionTitle: null,
          items: [
            {
              intlLabel: {
                id: getTrad('modalForm.attribute.text.type-selection'),
                defaultMessage: 'Type',
              },
              name: 'type',
              size: 12,
              type: 'booleanBox',
              options: [],
              // FIXME
              // options: [
              //   {
              //     headerId: getTrad('form.attribute.text.option.short-text'),
              //     descriptionId: getTrad('form.attribute.text.option.short-text.description'),
              //     value: 'string',
              //   },
              //   {
              //     headerId: getTrad('form.attribute.text.option.long-text'),
              //     descriptionId: getTrad('form.attribute.text.option.long-text.description'),
              //     value: 'text',
              //   },
              // ],
              // validations: {},
            },
          ],
        },
      ],
    };
  },
  uid: (data, step, attributes) => {
    const options = attributes
      .filter(({ type }) => ['string', 'text'].includes(type))
      .map(({ name }) => ({
        key: name,
        value: name,
        metadatas: {
          intlLabel: { id: `${name}.no-override`, defaultMessage: name },
        },
      }));

    return {
      sections: [
        {
          sectionTitle: null,
          items: [
            {
              ...nameField,
              placeholder: {
                id: getTrad('modalForm.attribute.form.base.name.placeholder'),
                defaultMessage: 'e.g. Slug, SEO URL, Canonical URL',
              },
            },
            {
              intlLabel: {
                id: getTrad('modalForm.attribute.target-field'),
                defaultMessage: 'Attached field',
              },
              name: 'targetField',
              type: 'select',
              options: [
                {
                  key: '__null_reset_value__',
                  value: '',
                  metadatas: { intlLabel: { id: getTrad('none'), defaultMessage: 'None' } },
                },
                ...options,
              ],
            },
          ],
        },
      ],
    };
  },
};

export default baseForm;
