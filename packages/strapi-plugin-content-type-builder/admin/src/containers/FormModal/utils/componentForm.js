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
          description: {
            id: getTrad('modalForm.attribute.form.base.name.description'),
          },
          validations: {
            required: true,
          },
        },
        {
          autoFocus: true,
          name: 'category',
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
  advanced() {},
};

export default componentForm;
