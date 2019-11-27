import { fromJS } from 'immutable';
import pluralize from 'pluralize';
import { createComponentUid } from './utils/createUid';

const initialState = fromJS({
  formErrors: {},
  modifiedData: {},
  initialData: {},
  componentToCreate: {},
  isCreatingComponentWhileAddingAField: false,
});

export const shouldPluralizeTargetAttribute = nature =>
  ['manyToMany', 'manyToOne'].includes(nature) ? 2 : 1;
export const shouldPluralizeName = nature =>
  ['manyToMany', 'oneToMany', 'manyWay'].includes(nature) ? 2 : 1;

const reducer = (state, action) => {
  switch (action.type) {
    case 'ON_CHANGE':
      return state.update('modifiedData', obj => {
        const {
          selectedContentTypeFriendlyName,
          keys,
          value,
          oneThatIsCreatingARelationWithAnother,
        } = action;

        if (keys.length === 1 && keys.includes('nature')) {
          return obj
            .update('nature', () => value)
            .update('dominant', () => {
              if (value === 'manyToMany') {
                return true;
              }

              return null;
            })
            .update('name', oldValue => {
              return pluralize(oldValue, shouldPluralizeName(value));
            })
            .update('targetAttribute', oldValue => {
              if (['oneWay', 'manyWay'].includes(value)) {
                return '-';
              }

              return pluralize(
                oldValue === '-'
                  ? oneThatIsCreatingARelationWithAnother
                  : oldValue,
                shouldPluralizeTargetAttribute(value)
              );
            })
            .update('targetColumnName', oldValue => {
              if (['oneWay', 'manyWay'].includes(value)) {
                return null;
              }

              return oldValue;
            });
        }

        if (keys.length === 1 && keys.includes('target')) {
          return obj
            .update('target', () => value)
            .update('name', () => {
              return pluralize(
                selectedContentTypeFriendlyName,
                shouldPluralizeName(obj.get('nature'))
              );
            })
            .update('targetAttribute', () => {
              if (['oneWay', 'manyWay'].includes(obj.get('nature'))) {
                return '-';
              }

              return pluralize(
                oneThatIsCreatingARelationWithAnother,
                shouldPluralizeTargetAttribute(obj.get('nature'))
              );
            });
        }

        return obj.updateIn(keys, () => value);
      });
    case 'RESET_PROPS':
      return initialState;
    case 'RESET_PROPS_AND_SET_FORM_FOR_ADDING_AN_EXISTING_COMPO': {
      return initialState.update('modifiedData', () =>
        fromJS({ type: 'component', repeatable: true })
      );
    }
    case 'RESET_PROPS_AND_SAVE_CURRENT_DATA': {
      const componentToCreate = state.getIn([
        'modifiedData',
        'componentToCreate',
      ]);
      const modifiedData = fromJS({
        type: 'component',
        repeatable: false,
        component: createComponentUid(
          componentToCreate.get('name'),
          componentToCreate.get('category')
        ),
      });

      return initialState
        .update('componentToCreate', () => componentToCreate)
        .update('modifiedData', () => modifiedData)
        .update('isCreatingComponentWhileAddingAField', () =>
          state.getIn(['modifiedData', 'createComponent'])
        );
    }
    case 'SET_ATTRIBUTE_DATA_SCHEMA': {
      const {
        attributeType,
        isEditing,
        modifiedDataToSetForEditing,
        nameToSetForRelation,
        targetUid,
        step,
      } = action;

      if (isEditing) {
        return state
          .update('modifiedData', () => fromJS(modifiedDataToSetForEditing))
          .update('initialData', () => fromJS(modifiedDataToSetForEditing));
      }

      let dataToSet;

      if (attributeType === 'component') {
        if (step === '1') {
          dataToSet = {
            type: 'component',
            createComponent: true,
            componentToCreate: { type: 'component' },
          };
        } else {
          dataToSet = {
            type: 'component',
            repeatable: true,
          };
        }
      } else if (attributeType === 'dynamiczone') {
        dataToSet = {
          type: 'dynamiczone',
          components: [],
        };
      } else if (attributeType === 'text') {
        dataToSet = { type: 'string' };
      } else if (attributeType === 'number' || attributeType === 'date') {
        dataToSet = {};
      } else if (attributeType === 'media') {
        dataToSet = { type: 'media', multiple: true };
      } else if (attributeType === 'enumeration') {
        dataToSet = { type: 'enumeration', enum: [] };
      } else if (attributeType === 'relation') {
        dataToSet = {
          name: nameToSetForRelation,
          // type: 'relation',
          nature: 'oneWay',
          targetAttribute: '-',
          target: targetUid,
          unique: false,
          required: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        };
      } else {
        dataToSet = { type: attributeType, default: null };
      }

      return state.update('modifiedData', () => fromJS(dataToSet));
    }

    case 'SET_ERRORS':
      return state.update('formErrors', () => fromJS(action.errors));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
