import getTrad from '../../../utils/getTrad';

const componentField = {
  intlLabel: {
    id: 'global.type',
    defaultMessage: 'Type',
  },
  name: 'createComponent',
  type: 'boolean-radio-group',
  size: 12,
  radios: [
    {
      title: {
        id: getTrad('form.attribute.component.option.create'),
        defaultMessage: 'Create a new component',
      },
      description: {
        id: getTrad('form.attribute.component.option.create.description'),
        defaultMessage:
          'A component is shared across types and components, it will be available and accessible everywhere.',
      },
      value: true,
    },
    {
      title: {
        id: getTrad('form.attribute.component.option.reuse-existing'),
        defaultMessage: 'Use an existing component',
      },
      description: {
        id: getTrad('form.attribute.component.option.reuse-existing.description'),
        defaultMessage:
          'Reuse a component already created to keep your data consistent across content-types.',
      },
      value: false,
    },
  ],
};

export default componentField;
