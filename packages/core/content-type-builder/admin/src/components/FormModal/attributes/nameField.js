import getTrad from '../../../utils/getTrad';

const nameField = {
  name: 'name',
  type: 'text',
  intlLabel: {
    id: 'global.name',
    defaultMessage: 'Name',
  },
  description: {
    id: getTrad('modalForm.attribute.form.base.name.description'),
    defaultMessage: 'No space is allowed for the name of the attribute',
  },
  // validations: {
  //   required: true,
  // },
};

export { nameField };
