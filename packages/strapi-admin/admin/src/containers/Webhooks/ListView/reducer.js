import { fromJS } from 'immutable';

const initialState = fromJS({
  webhooks: [],
  webhooksToDelete: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state.update('webhooks', () => fromJS(action.data));
    case 'SET_WEBHOOK_ENABLED':
      return state.updateIn(['webhooks', ...action.keys], () => action.value);
    case 'SET_WEBHOOKS_TO_DELETE':
      return state.update('webhooksToDelete', () => action.webhooks);
    case 'WEBHOOKS_DELETED':
      return state
        .update('webhooks', webhooks =>
          webhooks.filter(webhook => {
            return !state.get('webhooksToDelete').includes(webhook.get('id'));
          })
        )
        .update('webhooksToDelete', () => []);
    case 'WEBHOOK_DELETED':
      return state.update('webhooks', webhooks =>
        webhooks.splice(action.index, 1)
      );
    default:
      return state;
  }
};

export default reducer;
export { initialState };
