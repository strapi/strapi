import { getTrad } from '../../utils/getTrad';

import { componentField } from './component/componentField';
import { componentForm } from './component/componentForm';

export const dynamiczoneForm = {
  advanced: {
    default() {
      return {
        sections: componentForm.advanced(),
      };
    },
  },
  base: {
    createComponent() {
      return {
        sections: [
          { sectionTitle: null, items: [componentField] },
          ...componentForm.base('componentToCreate.'),
        ],
      };
    },
    default() {
      return {
        sections: [
          { sectionTitle: null, items: [componentField] },
          {
            sectionTitle: null,
            items: [
              {
                type: 'pushRight',
                size: 6,
                intlLabel: { id: '', defaultMessage: '' },
                name: 'pushRight',
              },
              {
                name: 'components',
                type: 'select-components',
                intlLabel: {
                  id: getTrad('modalForm.attributes.select-components'),
                  defaultMessage: 'Select the components',
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
