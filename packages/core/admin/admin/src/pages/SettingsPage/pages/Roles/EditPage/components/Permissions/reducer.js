import produce from 'immer';
import { cloneDeep, has, isObject, get, set } from 'lodash';
import updateConditionsToFalse from './utils/updateConditionsToFalse';
import updateValues from './utils/updateValues';

const initialState = {
  initialData: {},
  modifiedData: {},
  layouts: {},
};

/* eslint-disable consistent-return */
const reducer = (state, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      // This action is called when a checkbox in the <GlobalActions />
      // changes
      case 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX': {
        const { collectionTypeKind, actionId, value } = action;
        const pathToData = ['modifiedData', collectionTypeKind];

        Object.keys(get(state, pathToData)).forEach((collectionType) => {
          const collectionTypeActionData = get(
            state,
            [...pathToData, collectionType, actionId],
            undefined
          );

          if (collectionTypeActionData) {
            let updatedValues = updateValues(collectionTypeActionData, value);

            // We need to remove the applied conditions
            if (!value && updatedValues.conditions) {
              const updatedConditions = updateValues(updatedValues.conditions, false);

              updatedValues = { ...updatedValues, conditions: updatedConditions };
            }

            set(draftState, [...pathToData, collectionType, actionId], updatedValues);
          }
        });

        break;
      }
      case 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX': {
        const { pathToCollectionType, propertyName, rowName, value } = action;
        let nextModifiedDataState = cloneDeep(state.modifiedData);
        const pathToModifiedDataCollectionType = pathToCollectionType.split('..');

        const objToUpdate = get(nextModifiedDataState, pathToModifiedDataCollectionType, {});

        Object.keys(objToUpdate).forEach((actionId) => {
          // When a ct has multiple properties (ex: locales, field)
          // We need to make sure that we add any new property to the modifiedData
          // object.
          if (has(objToUpdate[actionId], `properties.${propertyName}`)) {
            const objValue = get(objToUpdate, [actionId, 'properties', propertyName, rowName]);
            const pathToDataToSet = [
              ...pathToModifiedDataCollectionType,
              actionId,
              'properties',
              propertyName,
              rowName,
            ];

            if (!isObject(objValue)) {
              set(nextModifiedDataState, pathToDataToSet, value);
            } else {
              const updatedValue = updateValues(objValue, value);

              set(nextModifiedDataState, pathToDataToSet, updatedValue);
            }
          }
        });

        // When we uncheck a row, we need to check if we also need to disable the conditions
        if (!value) {
          nextModifiedDataState = updateConditionsToFalse(nextModifiedDataState);
        }

        set(draftState, 'modifiedData', nextModifiedDataState);

        break;
      }
      case 'ON_CHANGE_CONDITIONS': {
        Object.entries(action.conditions).forEach((array) => {
          const [stringPathToData, conditionsToUpdate] = array;

          set(
            draftState,
            ['modifiedData', ...stringPathToData.split('..'), 'conditions'],
            conditionsToUpdate
          );
        });

        break;
      }
      case 'ON_CHANGE_SIMPLE_CHECKBOX': {
        let nextModifiedDataState = cloneDeep(state.modifiedData);

        set(nextModifiedDataState, [...action.keys.split('..')], action.value);

        // When we uncheck a single checkbox we need to remove the conditions from the parent
        if (!action.value) {
          nextModifiedDataState = updateConditionsToFalse(nextModifiedDataState);
        }

        set(draftState, 'modifiedData', nextModifiedDataState);

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
       * Since the case works well in order to update what we called "parent" checkbox. We can
       * reuse the action when we need to toggle change all the values that depends on this one.
       * A parent checkbox is a checkbox which value is not a boolean but depends on its children ones, therefore,
       * a parent checkbox does not have a represented value in the draftState, they are just helpers.
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
        const { keys, value } = action;
        const pathToValue = [...keys.split('..')];
        let nextModifiedDataState = cloneDeep(state.modifiedData);
        const oldValues = get(nextModifiedDataState, pathToValue, {});

        const updatedValues = updateValues(oldValues, value);
        set(nextModifiedDataState, pathToValue, updatedValues);

        // When we uncheck a parent checkbox we need to remove the associated conditions
        if (!value) {
          nextModifiedDataState = updateConditionsToFalse(nextModifiedDataState);
        }

        set(draftState, ['modifiedData'], nextModifiedDataState);

        break;
      }
      case 'RESET_FORM': {
        draftState.modifiedData = state.initialData;
        break;
      }
      case 'SET_FORM_AFTER_SUBMIT': {
        draftState.initialData = state.modifiedData;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
