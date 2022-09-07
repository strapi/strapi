import produce from 'immer';
import unset from 'lodash/unset';
import get from 'lodash/get';
import set from 'lodash/set';
import take from 'lodash/take';
import { moveFields } from './utils';
import { getMaxTempKey } from '../../utils';

const initialState = {
  componentsDataStructure: {},
  contentTypeDataStructure: {},
  formErrors: {},
  initialData: {},
  modifiedData: null,
  shouldCheckErrors: false,
  modifiedDZName: null,
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD': {
        set(
          draftState,
          ['modifiedData', ...action.keys],
          state.componentsDataStructure[action.componentUid]
        );

        break;
      }
      case 'ADD_REPEATABLE_COMPONENT_TO_FIELD': {
        let currentValue = get(state, ['modifiedData', ...action.keys], []).slice();

        const defaultDataStructure = {
          ...state.componentsDataStructure[action.componentUid],
          __temp_key__: getMaxTempKey(currentValue) + 1,
        };

        if (Array.isArray(currentValue)) {
          currentValue.push(defaultDataStructure);
        } else {
          currentValue = [defaultDataStructure];
        }

        set(draftState, ['modifiedData', ...action.keys], currentValue);

        if (action.shouldCheckErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        break;
      }
      case 'ADD_COMPONENT_TO_DYNAMIC_ZONE': {
        draftState.modifiedDZName = action.keys[0];

        if (action.shouldCheckErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        const defaultDataStructure = {
          ...state.componentsDataStructure[action.componentUid],
          __component: action.componentUid,
        };

        const currentValue = get(state, ['modifiedData', ...action.keys], null);
        const updatedValue = currentValue
          ? [...currentValue, defaultDataStructure]
          : [defaultDataStructure];

        set(draftState, ['modifiedData', ...action.keys], updatedValue);

        break;
      }
      case 'LOAD_RELATION': {
        const initialDataPath = ['initialData', ...action.keys];
        const modifiedDataPath = ['modifiedData', ...action.keys];
        const { value } = action;

        set(draftState, initialDataPath, value);
        set(draftState, modifiedDataPath, { connect: [], disconnect: [] });

        break;
      }
      case 'CONNECT_RELATION': {
        const path = ['modifiedData', ...action.keys];
        const { value } = action;

        const nextValue = get(draftState, [...path, 'connect']);
        nextValue.push(value);

        break;
      }
      case 'INIT_FORM': {
        draftState.formErrors = {};
        draftState.initialData = action.initialValues;
        draftState.modifiedData = action.initialValues;
        draftState.modifiedDZName = null;
        draftState.shouldCheckErrors = false;
        break;
      }
      case 'MOVE_COMPONENT_FIELD': {
        const currentValue = get(state, ['modifiedData', ...action.pathToComponent]);
        const valueToInsert = get(state, [
          'modifiedData',
          ...action.pathToComponent,
          action.dragIndex,
        ]);

        const updatedValue = moveFields(
          currentValue,
          action.dragIndex,
          action.hoverIndex,
          valueToInsert
        );

        set(draftState, ['modifiedData', ...action.pathToComponent], updatedValue);

        break;
      }
      case 'MOVE_COMPONENT_UP':
      case 'MOVE_COMPONENT_DOWN': {
        const { currentIndex, dynamicZoneName, shouldCheckErrors } = action;

        if (shouldCheckErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        const currentValue = state.modifiedData[dynamicZoneName];
        const nextIndex = action.type === 'MOVE_COMPONENT_UP' ? currentIndex - 1 : currentIndex + 1;
        const valueToInsert = state.modifiedData[dynamicZoneName][currentIndex];
        const updatedValue = moveFields(currentValue, currentIndex, nextIndex, valueToInsert);

        set(draftState, ['modifiedData', action.dynamicZoneName], updatedValue);

        break;
      }
      case 'MOVE_FIELD': {
        const currentValue = get(state, ['modifiedData', ...action.keys], []).slice();
        const valueToInsert = get(state, ['modifiedData', ...action.keys, action.dragIndex]);
        const updatedValue = moveFields(
          currentValue,
          action.dragIndex,
          action.overIndex,
          valueToInsert
        );

        set(draftState, ['modifiedData', ...action.keys], updatedValue);

        break;
      }
      case 'ON_CHANGE': {
        const [nonRepeatableComponentKey] = action.keys;

        // This is used to set the initialData for inputs
        // that needs an asynchronous initial value like the UID field
        // This is just a temporary patch.
        // TODO : Refactor the default form creation (workflow) to accept async default values.
        if (action.shouldSetInitialValue) {
          set(draftState, ['initialData', ...action.keys], action.value);
        }

        // FIXME: not sure this is needed...
        if (
          action.keys.length === 2 &&
          get(state, ['modifiedData', nonRepeatableComponentKey]) === null
        ) {
          set(draftState, ['modifiedData', nonRepeatableComponentKey], {
            [action.keys[1]]: action.value,
          });

          break;
        }

        set(draftState, ['modifiedData', ...action.keys], action.value);

        break;
      }
      case 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE': {
        if (action.shouldCheckErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        draftState.modifiedData[action.dynamicZoneName].splice(action.index, 1);

        break;
      }
      case 'REMOVE_COMPONENT_FROM_FIELD': {
        const componentPathToRemove = ['modifiedData', ...action.keys];

        set(draftState, componentPathToRemove, null);

        break;
      }
      case 'REMOVE_PASSWORD_FIELD': {
        unset(draftState, ['modifiedData', ...action.keys]);

        break;
      }
      case 'REMOVE_REPEATABLE_FIELD': {
        const keysLength = action.keys.length - 1;
        const pathToComponentData = ['modifiedData', ...take(action.keys, keysLength)];
        const hasErrors = Object.keys(state.formErrors).length > 0;

        if (hasErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        const currentValue = get(state, pathToComponentData).slice();
        currentValue.splice(parseInt(action.keys[keysLength], 10), 1);

        set(draftState, pathToComponentData, currentValue);

        break;
      }
      case 'DISCONNECT_RELATION': {
        const path = ['modifiedData', ...action.keys];
        const { value } = action;

        const nextValue = get(draftState, [...path, 'disconnect']);
        nextValue.push(value);

        break;
      }
      case 'SET_DEFAULT_DATA_STRUCTURES': {
        draftState.componentsDataStructure = action.componentsDataStructure;
        draftState.contentTypeDataStructure = action.contentTypeDataStructure;

        break;
      }
      case 'SET_FORM_ERRORS': {
        draftState.modifiedDZName = null;
        draftState.formErrors = action.errors;
        break;
      }
      case 'TRIGGER_FORM_VALIDATION': {
        const hasErrors = Object.keys(state.formErrors).length > 0;

        if (hasErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        break;
      }

      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
