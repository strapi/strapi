import { getTrad } from '../../../utils/getTrad';

export const categoryForm = {
  base: {
    sections: [
      {
        sectionTitle: null,
        items: [
          {
            autoFocus: true,
            name: 'name',
            type: 'text',
            intlLabel: {
              id: 'global.name',
              defaultMessage: 'Name',
            },

            // validations: {
            //   required: true,
            // },
            description: {
              id: getTrad('modalForm.editCategory.base.name.description'),
              defaultMessage: 'No space is allowed for the name of the category',
            },
          },
        ],
      },
    ],
  },
};
