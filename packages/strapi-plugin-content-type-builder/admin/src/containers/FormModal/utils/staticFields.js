import React from 'react';
import { FormattedMessage } from 'react-intl';
import getTrad from '../../../utils/getTrad';

const fields = {
  createComponent: {
    label: {
      id: getTrad('modalForm.attribute.text.type-selection'),
    },
    name: 'createComponent',
    type: 'booleanBox',
    size: 12,
    options: [
      {
        headerId: getTrad(`form.attribute.component.option.create`),
        descriptionId: getTrad(
          `form.attribute.component.option.create.description`
        ),
        value: true,
      },
      {
        headerId: getTrad(`form.attribute.component.option.reuse-existing`),
        descriptionId: getTrad(
          `form.attribute.component.option.reuse-existing.description`
        ),
        value: false,
      },
    ],
    validations: {},
  },

  dateAttribute: {
    label: {
      id: getTrad('modalForm.attribute.text.type-selection'),
    },
    name: 'type',
    type: 'select',
    options: [
      {
        id: 'components.InputSelect.option.placeholder',
        value: '',
      },
      {
        id: 'form.attribute.item.date.type.date',
        value: 'date',
      },
      {
        id: 'form.attribute.item.date.type.datetime',
        value: 'datetime',
      },
      // Not sure the ctm supports that one
      // {
      //   id: 'form.attribute.item.date.type.timestamp',
      //   value: 'timestamp',
      // },
      { id: 'form.attribute.item.date.type.time', value: 'time' },
    ].map(({ id, value }, index) => {
      const disabled = index === 0;
      const tradId = index === 0 ? id : getTrad(id);

      return (
        <FormattedMessage id={tradId} key={id}>
          {msg => (
            <option disabled={disabled} hidden={disabled} value={value}>
              {msg}
            </option>
          )}
        </FormattedMessage>
      );
    }),
    validations: {
      required: true,
    },
  },
  default: {
    autoFocus: true,
    name: 'default',
    type: 'text',
    label: {
      id: getTrad('form.attribute.settings.default'),
    },
    validations: {},
  },
  divider: {
    type: 'divider',
  },
  enumerationAttribute: {
    autoFocus: false,
    name: 'enum',
    type: 'textarea',
    size: 8,
    label: {
      id: getTrad('form.attribute.item.enumeration.rules'),
    },
    placeholder: {
      id: getTrad('form.attribute.item.enumeration.placeholder'),
    },
    validations: {
      required: true,
    },
  },
  max: {
    autoFocus: false,
    name: 'max',
    type: 'customCheckboxWithChildren',
    label: {
      id: getTrad(`form.attribute.item.maximum`),
    },
    validations: {},
  },
  min: {
    autoFocus: false,
    name: 'min',
    type: 'customCheckboxWithChildren',
    label: {
      id: getTrad(`form.attribute.item.minimum`),
    },
    validations: {},
  },
  name: {
    autoFocus: true,
    name: 'name',
    type: 'text',
    label: {
      id: getTrad('modalForm.attribute.form.base.name'),
    },
    description: {
      id: getTrad('modalForm.attribute.form.base.name.description'),
    },
    validations: {
      required: true,
    },
  },
  numberAttribute: {
    label: {
      id: getTrad('form.attribute.item.number.type'),
    },
    name: 'type',
    type: 'select',
    options: [
      {
        id: 'components.InputSelect.option.placeholder',
        value: '',
      },
      {
        id: 'form.attribute.item.number.type.integer',
        value: 'integer',
      },
      {
        id: 'form.attribute.item.number.type.biginteger',
        value: 'biginteger',
      },
      {
        id: 'form.attribute.item.number.type.decimal',
        value: 'decimal',
      },
      {
        id: 'form.attribute.item.number.type.float',
        value: 'float',
      },
    ].map(({ id, value }, index) => {
      const disabled = index === 0;
      const tradId = index === 0 ? id : getTrad(id);

      return (
        <FormattedMessage id={tradId} key={id}>
          {msg => (
            <option disabled={disabled} hidden={disabled} value={value}>
              {msg}
            </option>
          )}
        </FormattedMessage>
      );
    }),
    validations: {
      required: true,
    },
  },
  required: {
    autoFocus: false,
    name: 'required',
    type: 'checkbox',
    label: {
      id: getTrad('form.attribute.item.requiredField'),
    },
    description: {
      id: getTrad('form.attribute.item.requiredField.description'),
    },
    validations: {},
  },
  private: {
    autoFocus: false,
    name: 'private',
    type: 'checkbox',
    label: {
      id: getTrad('form.attribute.item.privateField'),
    },
    description: {
      id: getTrad('form.attribute.item.privateField.description'),
    },
    validations: {},
  },
  unique: {
    autoFocus: false,
    name: 'unique',
    type: 'checkbox',
    label: {
      id: getTrad('form.attribute.item.uniqueField'),
    },
    description: {
      id: getTrad('form.attribute.item.uniqueField.description'),
    },
    validations: {},
  },
};

export default fields;
