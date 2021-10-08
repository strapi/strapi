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
            intlLabel: {
              id: getTrad('modalForm.attribute.form.base.name'),
              defaultMessage: 'Name',
            },
          },
          {
            name: `${prefix}category`,
            type: 'creatableSelect',
            intlLabel: {
              id: getTrad('modalForm.components.create-component.category.label'),
              defaultMessage: 'Select a category or enter a name to create a new one',
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
            intlLabel: {
              id: getTrad('modalForm.components.icon.label'),
              defaultMessage: 'Icon',
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
