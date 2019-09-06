import { fromJS } from 'immutable';

const initialState = fromJS({
  didCheckErrors: false,
  errors: {},
  modifiedData: {},
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );
    case 'SET_ERRORS':
      return state
        .update('errors', () => action.errors)
        .update('didCheckErrors', v => !v);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
