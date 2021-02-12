import produce from 'immer';
import { has, isObject, get, set } from 'lodash';
import updateValues from './utils/updateValues';

const initialState = {
  initialData: {},
  modifiedData: {},
};

/* eslint-disable consistent-return */
const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX': {
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
      case 'ON_CHANGE_SIMPLE_CHECKBOX': {
        set(draftState, ['modifiedData', ...action.keys.split('..')], action.value);

        break;
      }
      /*
       * Here the idea is to retrieve a specific value of the modifiedObject
       * then update all the boolean values of the retrieved one
       * and update the drafState.
       *
       * For instance in order to enable create action for all the fields and locales
       * of the restaurant content type we need to :
       * 1. Retrieve the modifiedData.collectionTypes.restaurant.create object
       * 2. Toggle all the end boolean values to the desired one
       * 3. Update the draftState
       *
       * Since the case works well in order to update what we called "dependent" checkbox. We can
       * reuse the action when we need to toggle change all the values that depends on this one.
       * A dependent checkbox is a checkbox which value is not a boolean but depends on its children ones, therefore,
       * a dependent checkbox does not have a represented value in the draftState, they are just helpers.
       *
       * Given the following data:
       *
       * const data = {
       *  restaurant: {
       *   create: {
       *     fields: { name: true },
       *     locales: { en: false }
       *   }
       *  }
       * }
       *
       * The value of the create checkbox for the restaurant will be ƒalse since not all its children have
       * truthy values and in order to set its value to true when need to have all the values of its children set to true.
       *
       * Similarly, we can reuse the logic for the components attributes
       *
       */
      case 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX': {
        const pathToValue = ['modifiedData', ...action.keys.split('..')];
        const oldValues = get(state, pathToValue, {});

        const updatedValues = updateValues(oldValues, action.value);

        set(draftState, pathToValue, updatedValues);

        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
