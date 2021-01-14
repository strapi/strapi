import getTrad from '../../../utils/getTrad';
import { componentField, componentForm } from '../component';

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
