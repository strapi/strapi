import getTrad from '../../../utils/getTrad';

const componentForm = {
  base(prefix = '') {
    const sections = [
      {
        sectionTitle: null,
        items: [
          {
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
      },
      {
        sectionTitle: null,
        items: [
          {
            name: `${prefix}icon`,
            type: 'componentIconPicker',
            size: 12,
            label: {
              id: getTrad('modalForm.components.icon.label'),
            },
          },
        ],
      },
    ];

    return sections;
  },
  advanced() {
    const sections = [];

    return sections;
  },
};

export default componentForm;
