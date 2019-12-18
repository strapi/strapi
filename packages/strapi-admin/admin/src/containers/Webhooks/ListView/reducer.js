import { fromJS } from 'immutable';

const initialState = fromJS({
  webhooks: [],
  shouldRefetchData: false,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state.update('webhooks', () => fromJS(action.data));
    case 'SET_WEBHOOK_ENABLED':
      return state.updateIn(['webhooks', ...action.keys], () => action.value);
    case 'WEBHOOK_DELETED': {
      return state.update('webhooks', webhooks =>
        webhooks.splice(action.index, 1)
      );
    }
    case 'WEBHOOKS_DELETED':
      return state.update('shouldRefetchData', v => !v);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
