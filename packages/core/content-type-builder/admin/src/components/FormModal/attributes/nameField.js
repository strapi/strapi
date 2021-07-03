import getTrad from '../../../utils/getTrad';

const nameField = {
  autoFocus: true,
  name: 'name',
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
};

// eslint-disable-next-line import/prefer-default-export
export { nameField };
