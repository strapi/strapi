import {
  fromJS,
  // List,
} from 'immutable';
import getMax from './utils/getMax';

const initialState = fromJS({
  formErrors: {},
  isLoading: true,
  initialData: {},
  modifiedData: {},
  shouldShowLoadingState: false,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD':
      return state.updateIn(['modifiedData', ...action.keys], () => {
        return fromJS({});
      });
    case 'ADD_REPEATABLE_COMPONENT_TO_FIELD': {
      return state.updateIn(['modifiedData', ...action.keys], list => {
        const defaultAttribute = fromJS({});

        if (list) {
          const max = getMax(list);

          return list.push(defaultAttribute.set('_temp__id', max + 1));
        }

        return fromJS([defaultAttribute.set('_temp__id', 0)]);
      });
    }
    case 'ADD_COMPONENT_TO_DYNAMIC_ZONE':
      return state.updateIn(['modifiedData', ...action.keys], list => {
        const componentToAdd = fromJS({
          __component: action.componentUid,
        });

        if (list) {
          return list.push(componentToAdd);
        }

        return fromJS([componentToAdd]);
      });
    case 'ADD_RELATION':
      return state.updateIn(['modifiedData', ...action.keys], list => {
        if (!action.value) {
          return list;
        }

        const el = action.value[0].value;

        if (list) {
          return list.push(fromJS(el));
        }

        return fromJS([el]);
      });
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('initialData', () => fromJS(action.data))
        .update('modifiedData', () => fromJS(action.data))
        .update('isLoading', () => false);
    case 'IS_SUBMITTING':
      return state.update('shouldShowLoadingState', () => action.value);
    case 'MOVE_FIELD':
      return state.updateIn(['modifiedData', ...action.keys], list => {
        return list
          .delete(action.dragIndex)
          .insert(action.overIndex, list.get(action.dragIndex));
      });
    case 'ON_CHANGE': {
      let newState = state;
      const [nonRepeatableComponentKey] = action.keys;

      if (
        action.keys.length === 2 &&
        state.getIn(['modifiedData', nonRepeatableComponentKey]) === null
      ) {
        newState = state.updateIn(
          ['modifiedData', nonRepeatableComponentKey],
          () => fromJS({})
        );
      }

      return newState.updateIn(['modifiedData', ...action.keys], () => {
        return action.value;
      });
    }
    case 'REMOVE_COMPONENT_FROM_FIELD': {
      const componentPathToRemove = ['modifiedData', ...action.keys];

      return state.updateIn(componentPathToRemove, () => null);
    }
    case 'REMOVE_REPEATABLE_FIELD': {
      const componentPathToRemove = ['modifiedData', ...action.keys];

      return state.deleteIn(componentPathToRemove);
    }

    case 'REMOVE_RELATION':
      return state.removeIn(['modifiedData', ...action.keys.split('.')]);
    case 'RESET_DATA':
      return state
        .update('modifiedData', () => state.get('initialData'))
        .update('formErrors', () => fromJS({}));

    case 'RESET_PROPS':
      return initialState;
    case 'SUBMIT_ERRORS':
      return state
        .update('formErrors', () => fromJS(action.errors))
        .update('shouldShowLoadingState', () => false);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
