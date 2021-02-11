import produce from 'immer';
import { set } from 'lodash';

const initialState = {
  initialData: {},
  modifiedData: {
    collectionTypes: {
      address: {
        'content-manager.explorer.create': {
          fields: {
            postal_coder: true,
            categories: false,
            cover: true,
            images: true,
            city: true,
          },
        },
      },
      restaurant: {
        'content-manager.explorer.create': {
          fields: {
            f1: true,
            f2: true,
            services: {
              name: true,
              media: true,
              closing: {
                name: {
                  test: true,
                },
              },
            },
            dz: true,
          },
          locales: {
            fr: true,
            en: true,
          },
        },
      },
    },
  },
};

/* eslint-disable consistent-return */
const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_CHANGE_SIMPLE_CHECKBOX': {
        set(draftState, ['modifiedData', ...action.keys.split('..')], action.value);
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
