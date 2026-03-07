import { getTrad } from '../../../utils/getTrad';

export const attributeOptions = {
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
  indexMode: {
    name: 'indexMode',
    type: 'radio-group',
    size: 12,
    intlLabel: {
      id: getTrad('form.attribute.item.indexMode'),
      defaultMessage: 'Indexing',
    },
    radios: [
      {
        value: 'none',
        title: {
          id: getTrad('form.attribute.item.indexMode.none'),
          defaultMessage: 'No index',
        },
        description: {
          id: getTrad('form.attribute.item.indexMode.none.description'),
          defaultMessage: 'No uniqueness or explicit database index is created.',
        },
      },
      {
        value: 'unique-global',
        title: {
          id: getTrad('form.attribute.item.indexMode.uniqueGlobal'),
          defaultMessage: 'Unique (global)',
        },
        description: {
          id: getTrad('form.attribute.item.indexMode.uniqueGlobal.description'),
          defaultMessage: 'Enforces uniqueness across all records.',
        },
      },
      {
        value: 'unique-variant',
        title: {
          id: getTrad('form.attribute.item.indexMode.uniqueVariant'),
          defaultMessage: 'Unique (variant)',
        },
        description: {
          id: getTrad('form.attribute.item.indexMode.uniqueVariant.description'),
          defaultMessage: 'Enforces uniqueness per variant dimensions (for example locale).',
        },
      },
      {
        value: 'index',
        title: {
          id: getTrad('form.attribute.item.indexMode.index'),
          defaultMessage: 'Index (non-unique)',
        },
        description: {
          id: getTrad('form.attribute.item.indexMode.index.description'),
          defaultMessage: 'Creates a regular index to speed up queries.',
        },
      },
    ],
  },
};
