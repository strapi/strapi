import getTrad from '../../../utils/getTrad';

const form = {
  base: {
    items: [
      [
        {
          autoFocus: true,
          name: 'name',
          type: 'text',
          label: {
            id: getTrad('modalForm.attribute.form.base.name'),
          },

          validations: {
            required: true,
          },
          description: {
            id: getTrad('modalForm.editCategory.base.name.description'),
          },
        },
      ],
    ],
  },
};

export default form;
