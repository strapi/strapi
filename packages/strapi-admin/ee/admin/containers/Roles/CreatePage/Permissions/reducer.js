import produce from 'immer';
import { has, isObject, get, set } from 'lodash';

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
          enabled: true,
          // locales: {
          //   fr: false,
          //   en: false,
          // },
          conditions: {
            'admin::is-creator': false,
            'admin::has-same-role-as-creator': false,
          },
        },
        'content-manager.explorer.publish': {
          enabled: true,
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

const updateValues = (obj, valueToSet) => {
  return Object.keys(obj).reduce((acc, current) => {
    const currentValue = obj[current];

    if (current === 'conditions') {
      acc[current] = currentValue;

      return acc;
    }

    if (isObject(currentValue)) {
      return { ...acc, [current]: updateValues(currentValue, valueToSet) };
    }

    acc[current] = valueToSet;

    return acc;
  }, {});
};

/* eslint-disable consistent-return */
const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX': {
        const { pathToCollectionType, propertyName, rowName, value } = action;
        const pathToModifiedDataCollectionType = [
          'modifiedData',
          ...pathToCollectionType.split('..'),
        ];
        const objToUpdate = get(state, pathToModifiedDataCollectionType, {});

        Object.keys(objToUpdate).forEach(actionId => {
          if (has(objToUpdate[actionId], propertyName)) {
            const objValue = get(objToUpdate, [actionId, propertyName, rowName]);
            const pathToDataToSet = [
              ...pathToModifiedDataCollectionType,
              actionId,
              propertyName,
              rowName,
            ];

            if (!isObject(objValue)) {
              set(draftState, pathToDataToSet, value);
            } else {
              const updatedValue = updateValues(objValue, value);

              set(draftState, pathToDataToSet, updatedValue);
            }
          }
        });

        break;
      }
      case 'ON_CHANGE_COLLECTION_TYPE_PARENT_CHECKBOX': {
        const { collectionTypeKind, actionId, value } = action;
        const pathToData = ['modifiedData', collectionTypeKind];

        Object.keys(get(state, pathToData)).forEach(collectionType => {
          const collectionTypeActionData = get(
            state,
            [...pathToData, collectionType, actionId],
            undefined
          );

          if (collectionTypeActionData) {
            const updatedValues = updateValues(collectionTypeActionData, value);

            set(draftState, [...pathToData, collectionType, actionId], updatedValues);
          }
        });

        break;
      }
      case 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX': {
        const pathToValue = ['modifiedData', ...action.keys.split('..')];
        const oldValues = get(state, pathToValue, {});

        const updatedValues = updateValues(oldValues, action.value);

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
