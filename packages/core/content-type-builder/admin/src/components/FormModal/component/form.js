import getTrad from '../../../utils/getTrad';

const componentForm = {
  base(prefix = '') {
    const sections = [
      {
        sectionTitle: null,
        items: [
          {
            name: `${prefix}displayName`,
            type: 'text',
            intlLabel: {
              id: getTrad('contentType.displayName.label'),
              defaultMessage: 'Display Name',
            },
          },
          {
            name: `${prefix}category`,
            type: 'select-category',
            intlLabel: {
              id: getTrad('modalForm.components.create-component.category.label'),
              defaultMessage: 'Select a category or enter a name to create a new one',
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
