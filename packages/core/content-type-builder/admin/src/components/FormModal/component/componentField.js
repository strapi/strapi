import getTrad from '../../../utils/getTrad';

const componentField = {
  intlLabel: {
    id: getTrad('modalForm.attribute.text.type-selection'),
    defaultMessage: 'Type',
  },
  name: 'createComponent',
  type: 'booleanBox',
  size: 12,
  // FIXME
  options: [],
  // options: [
  //   {
  //     headerId: getTrad('form.attribute.component.option.create'),
  //     descriptionId: getTrad('form.attribute.component.option.create.description'),
  //     value: true,
  //   },
  //   {
  //     headerId: getTrad('form.attribute.component.option.reuse-existing'),
  //     descriptionId: getTrad('form.attribute.component.option.reuse-existing.description'),
  //     value: false,
  //   },
  // ],
  // validations: {},
};

export default componentField;
