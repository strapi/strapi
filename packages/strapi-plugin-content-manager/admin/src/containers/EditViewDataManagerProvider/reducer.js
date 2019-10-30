import {
  fromJS,
  // List,
} from 'immutable';

const initialState = fromJS({
  formErrors: {},
  isLoading: true,
  initialData: {},
  modifiedData: {},
  shouldShowLoadingState: false,
});

const reducer = (state, action) => {
  switch (action.type) {
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
    case 'IS_SUBMITING':
      return state.update('shouldShowLoadingState', () => true);
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
    case 'REMOVE_RELATION':
      return state.removeIn(['modifiedData', ...action.keys.split('.')]);
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
