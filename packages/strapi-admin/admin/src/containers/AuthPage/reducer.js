import { fromJS } from 'immutable';

const initialState = fromJS({
  didCheckErrors: false,
  errors: {},
  modifiedData: {},
  userEmail: '',
  submitSuccess: false,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );
    case 'RESET_PROPS':
      return initialState;
    case 'SET_ERRORS':
      return state
        .update('errors', () => action.formErrors)
        .update('didCheckErrors', v => !v);
    case 'SUBMIT_SUCCESS':
      return state
        .update('userEmail', () => action.email)
        .update('submitSuccess', () => true);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
