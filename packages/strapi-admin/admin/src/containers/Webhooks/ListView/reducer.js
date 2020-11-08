import { fromJS } from 'immutable';

const initialState = fromJS({
  webhooks: [],
  webhooksToDelete: [],
  webhookToDelete: null,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state.update('webhooks', () => fromJS(action.data));
    case 'SET_WEBHOOK_ENABLED':
      return state.updateIn(['webhooks', ...action.keys], () => action.value);
    case 'SET_WEBHOOK_TO_DELETE':
      return state.update('webhookToDelete', () => action.id);
    case 'SET_WEBHOOKS_TO_DELETE':
      return state.update('webhooksToDelete', list => {
        if (action.value) {
          return list.push(action.id);
        }

        return list.filter(data => data !== action.id);
      });
    case 'WEBHOOKS_DELETED':
      return state
        .update('webhooks', webhooks =>
          webhooks.filter(webhook => {
            return !state.get('webhooksToDelete').includes(webhook.get('id'));
          })
        )
        .update('webhooksToDelete', () => []);
    case 'WEBHOOK_DELETED':
      return state
        .update('webhooks', webhooks => webhooks.remove(action.index))
        .update('webhookToDelete', () => null);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
