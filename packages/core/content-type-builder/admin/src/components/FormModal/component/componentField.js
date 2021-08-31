import getTrad from '../../../utils/getTrad';

const componentField = {
  label: {
    id: getTrad('modalForm.attribute.text.type-selection'),
  },
  name: 'createComponent',
  type: 'booleanBox',
  size: 12,
  options: [
    {
      headerId: getTrad('form.attribute.component.option.create'),
      descriptionId: getTrad('form.attribute.component.option.create.description'),
      value: true,
    },
    {
      headerId: getTrad('form.attribute.component.option.reuse-existing'),
      descriptionId: getTrad('form.attribute.component.option.reuse-existing.description'),
      value: false,
    },
  ],
  validations: {},
};

export default componentField;
