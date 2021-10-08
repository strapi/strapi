import getTrad from '../../../utils/getTrad';
import { componentField, componentForm } from '../component';

const form = {
  advanced: {
    default: () => {
      return {
        sections: componentForm.advanced('componentToCreate.'),
      };
    },
  },
  base: {
    createComponent: () => {
      return {
        sections: [
          { sectionTitle: null, items: [componentField] },
          ...componentForm.base('componentToCreate.'),
        ],
      };
    },
    default: () => {
      return {
        sections: [
          { sectionTitle: null, items: [componentField] },
          {
            sectionTitle: null,
            items: [
              // TODO
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
          },
        ],
      };
    },
  },
};

export default form;
