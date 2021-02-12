import produce from 'immer';
import { isObject, get, set } from 'lodash';

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
          conditions: {
            'admin::is-creator': false,
            'admin::has-same-role-as-creator': false,
          },
        },
        'content-manager.explorer.read': {
          fields: {
            postal_coder: true,
            categories: false,
            cover: true,
            images: true,
            city: true,
          },
          conditions: {
            'admin::is-creator': false,
            'admin::has-same-role-as-creator': false,
          },
        },
        'content-manager.explorer.delete': {
          enabled: false,
          conditions: {
            'admin::is-creator': false,
            'admin::has-same-role-as-creator': false,
          },
        },
        'content-manager.explorer.update': {
          fields: {
            postal_coder: true,
            categories: false,
            cover: true,
            images: true,
            city: true,
          },
          conditions: {
            'admin::is-creator': false,
            'admin::has-same-role-as-creator': false,
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
            relation: true,
          },
          locales: {
            fr: true,
            en: true,
          },
        },
        'content-manager.explorer.delete': {
          locales: {
            fr: false,
            en: false,
          },
          conditions: {
            'admin::is-creator': false,
            'admin::has-same-role-as-creator': false,
          },
        },
        'content-manager.explorer.read': {
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
            relation: true,
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
      case 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX': {
        const pathToValue = ['modifiedData', ...action.keys.split('..')];
        const oldValues = get(state, pathToValue, {});

        const updateValues = obj => {
          return Object.keys(obj).reduce((acc, current) => {
            const currentValue = obj[current];

            if (current === 'conditions') {
              acc[current] = currentValue;

              return acc;
            }

            if (isObject(currentValue)) {
              return { ...acc, [current]: updateValues(currentValue) };
            }

            acc[current] = action.value;

            return acc;
          }, {});
        };

        const updatedValues = updateValues(oldValues);

        set(draftState, pathToValue, updatedValues);

        break;
      }
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
