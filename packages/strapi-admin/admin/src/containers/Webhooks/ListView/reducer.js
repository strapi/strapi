import { fromJS } from 'immutable';

const initialState = fromJS({
  webhooks: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state.update('webhooks', () => fromJS(action.data));
    case 'SET_WEBHOOK_ENABLED':
      return state.updateIn(['webhooks', ...action.keys], () => action.value);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
