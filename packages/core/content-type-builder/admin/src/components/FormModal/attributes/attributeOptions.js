import getTrad from '../../../utils/getTrad';

const attributeOptions = {
  default: {
    name: 'default',
    type: 'text',
    intlLabel: {
      id: getTrad('form.attribute.settings.default'),
      defaultMessage: 'Default value',
    },
  },
  max: {
    name: 'max',
    type: 'checkbox-with-number-field',
    intlLabel: {
      id: getTrad('form.attribute.item.maximum'),
      defaultMessage: 'Maximum value',
    },
  },
  maxLength: {
    name: 'maxLength',
    type: 'checkbox-with-number-field',
    intlLabel: {
      id: getTrad('form.attribute.item.maximumLength'),
      defaultMessage: 'Maximum length',
    },
  },
  min: {
    name: 'min',
    type: 'checkbox-with-number-field',
    intlLabel: {
      id: getTrad('form.attribute.item.minimum'),
      defaultMessage: 'Minimum value',
    },
  },
  minLength: {
    name: 'minLength',
    type: 'checkbox-with-number-field',
    intlLabel: {
      id: getTrad('form.attribute.item.minimumLength'),
      defaultMessage: 'Minimum length',
    },
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
  },
  regex: {
    intlLabel: {
      id: getTrad('form.attribute.item.text.regex'),
      defaultMessage: 'RegExp pattern',
    },
    name: 'regex',
    type: 'text',
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
  },
};

export default attributeOptions;
