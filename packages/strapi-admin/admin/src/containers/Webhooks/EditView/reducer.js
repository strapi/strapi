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
    default:
      return state;
  }
};

export default reducer;
export { initialState };
