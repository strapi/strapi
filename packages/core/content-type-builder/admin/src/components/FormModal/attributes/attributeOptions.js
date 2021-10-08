import getTrad from '../../../utils/getTrad';

const attributeOptions = {
  default: {
    name: 'default',
    type: 'text',
    intlLabel: {
      id: getTrad('form.attribute.settings.default'),
      defaultMessage: 'Default value',
    },
    // validations: {},
  },
  max: {
    name: 'max',
    type: 'customCheckboxWithChildren',
    intlLabel: {
      id: getTrad('form.attribute.item.maximum'),
      defaultMessage: 'Maximum value',
    },
    // validations: {},
  },
  maxLength: {
    name: 'maxLength',
    type: 'customCheckboxWithChildren',
    intlLabel: {
      id: getTrad('form.attribute.item.maximumLength'),
      defaultMessage: 'Maximum length',
    },
    // validations: {},
  },
  min: {
    name: 'min',
    type: 'customCheckboxWithChildren',
    intlLabel: {
      id: getTrad('form.attribute.item.minimum'),
      defaultMessage: 'Minimum value',
    },
    // validations: {},
  },
  minLength: {
    name: 'minLength',
    type: 'customCheckboxWithChildren',
    intlLabel: {
      id: getTrad('form.attribute.item.minimumLength'),
      defaultMessage: 'Minimum length',
    },
    // validations: {},
  },
  private: {
    name: 'private',
    type: 'checkbox',
    intlLabel: {
      id: getTrad('form.attribute.item.privateField'),
      defaultMessage: 'Private field',
    },
    description: {
      id: getTrad('form.attribute.item.privateField.description'),
      defaultMessage: 'This field will not show up in the API response',
    },
    // validations: {},
  },
  regex: {
    intlLabel: {
      id: getTrad('form.attribute.item.text.regex'),
      defaultMessage: 'RegExp pattern',
    },
    name: 'regex',
    type: 'text',
    // validations: {},
    description: {
      id: getTrad('form.attribute.item.text.regex.description'),
      defaultMessage: 'The text of the regular expression',
    },
  },
  required: {
    name: 'required',
    type: 'checkbox',
    intlLabel: {
      id: getTrad('form.attribute.item.requiredField'),
      defaultMessage: 'Required field',
    },
    description: {
      id: getTrad('form.attribute.item.requiredField.description'),
      defaultMessage: "You won't be able to create an entry if this field is empty",
    },
    // validations: {},
  },
  unique: {
    name: 'unique',
    type: 'checkbox',
    intlLabel: {
      id: getTrad('form.attribute.item.uniqueField'),
      defaultMessage: 'Unique field',
    },
    description: {
      id: getTrad('form.attribute.item.uniqueField.description'),
      defaultMessage:
        "You won't be able to create an entry if there is an existing entry with identical content",
    },
    // validations: {},
  },
};

export default attributeOptions;
