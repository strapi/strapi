import getTrad from '../../../utils/getTrad';

const fields = {
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
