import { fromJS } from 'immutable';

const initialState = fromJS({
  didCheckErrors: false,
  errors: {},
  initialData: {},
  modifiedData: {},
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('initialData', () => fromJS(action.response))
        .update('modifiedData', () => fromJS(action.response));
    case 'ON_CHANGE':
      return state.updateIn(['modifiedData', action.keys], () => action.value);
    case 'SET_ERRORS':
      return state
        .update('didCheckErrors', v => !v)
        .update('errors', () => fromJS(action.errors));
    case 'RESET_FORM':
      return state
        .update('modifiedData', () => state.get('initialData'))
        .update('didCheckErrors', v => !v)
        .update('errors', () => fromJS({}));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
