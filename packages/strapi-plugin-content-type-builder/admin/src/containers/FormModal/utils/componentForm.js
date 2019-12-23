import getTrad from '../../../utils/getTrad';

const componentForm = {
  base(prefix = '') {
    const items = [
      [
        {
          autoFocus: true,
          name: `${prefix}name`,
          type: 'text',
          label: {
            id: getTrad('modalForm.attribute.form.base.name'),
          },

          validations: {
            required: true,
          },
        },
        {
          autoFocus: true,
          name: `${prefix}category`,
          type: 'creatableSelect',
          label: {
            id: getTrad('modalForm.components.create-component.category.label'),
          },
          validations: {
            required: true,
          },
        },
      ],
      [
        {
          name: `${prefix}icon`,
          type: 'componentIconPicker',
          size: 12,
          label: {
            id: getTrad('modalForm.components.icon.label'),
          },
        },
      ],
    ];

    return items;
  },
  advanced(prefix = '') {
    const items = [
      [
        {
          autoFocus: true,
          label: {
            id: getTrad('contentType.collectionName.label'),
          },
          description: {
            id: getTrad('contentType.collectionName.description'),
          },
          name: `${prefix}collectionName`,
          type: 'text',
          validations: {},
        },
      ],
    ];

    return items;
  },
};

export default componentForm;
