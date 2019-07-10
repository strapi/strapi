import { fromJS } from 'immutable';

const initialState = fromJS({
  initialData: [],
  modifiedData: [],
});

function reducer(state, action) {
  switch (action.type) {
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );
    case 'RESET_FILTERS':
      return initialState;
    case 'SET_FILTERS':
      return state
        .update('initialData', () => fromJS(action.initialFilters))
        .update('modifiedData', () => fromJS(action.initialFilters));
    default:
      return state;
  }
}

export default reducer;
export { initialState };
