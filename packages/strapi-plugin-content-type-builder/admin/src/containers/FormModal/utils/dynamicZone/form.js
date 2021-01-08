import getTrad from '../../../../utils/getTrad';

import { componentForm } from '../component';

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

const form = {
  advanced: {
    default: () => {
      return {
        items: componentForm.advanced('componentToCreate.'),
      };
    },
  },
  base: {
    createComponent: () => {
      return {
        items: [
          [componentField],
          [{ type: 'spacer' }],
          ...componentForm.base('componentToCreate.'),
        ],
      };
    },
    default: () => {
      return {
        items: [
          [componentField],
          [{ type: 'spacer' }],
          [
            { type: 'pushRight', size: 6 },
            {
              name: 'components',
              type: 'componentSelect',
              label: {
                id: getTrad('modalForm.attributes.select-components'),
              },
              isMultiple: true,
            },
          ],
          [{ type: 'spacer-small' }],
        ],
      };
    },
  },
};

export default form;
