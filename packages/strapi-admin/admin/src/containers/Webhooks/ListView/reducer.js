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
    case 'WEBHOOK_DELETED': {
      console.log(state.get('webhooks'));
      console.log(action.index);

      return state.update('webhooks', webhooks =>
        webhooks.splice(action.index, 1)
      );
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
