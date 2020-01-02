import { fromJS } from 'immutable';

const initialState = fromJS({
  initialWebhook: {},
  modifiedWebhook: {},
  shouldRefetchData: false,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('initialWebhook', () => fromJS(action.data))
        .update('modifiedWebhook', () => fromJS(action.data))
        .update('shouldRefetchData', () => false);
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedWebhook', ...action.keys],
        () => action.value
      );
    case 'SET_ERRORS': {
      return state.update('formErrors', () => fromJS(action.errors));
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
