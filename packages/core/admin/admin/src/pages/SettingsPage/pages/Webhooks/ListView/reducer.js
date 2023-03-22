import produce from 'immer';
import set from 'lodash/set';

const initialState = {
  webhooks: [],
  webhooksToDelete: [],
  webhookToDelete: null,
  loadingWebhooks: true,
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        draftState.webhooks = action.data;
        draftState.loadingWebhooks = false;
        break;
      }

      case 'TOGGLE_LOADING': {
        draftState.loadingWebhooks = !state.loadingWebhooks;
        break;
      }

      case 'SET_WEBHOOK_ENABLED': {
        set(draftState, ['webhooks', ...action.keys], action.value);
        break;
      }

      case 'SET_WEBHOOK_TO_DELETE': {
        draftState.webhookToDelete = action.id;
        break;
      }
      case 'SET_WEBHOOKS_TO_DELETE': {
        if (action.value) {
          draftState.webhooksToDelete.push(action.id);
        } else {
          draftState.webhooksToDelete = state.webhooksToDelete.filter((id) => id !== action.id);
        }

        break;
      }
      case 'SET_ALL_WEBHOOKS_TO_DELETE': {
        if (state.webhooksToDelete.length === 0) {
          draftState.webhooksToDelete = state.webhooks.map((webhook) => webhook.id);
        } else {
          draftState.webhooksToDelete = [];
        }

        break;
      }
      case 'WEBHOOKS_DELETED': {
        draftState.webhooks = state.webhooks.filter(
          (webhook) => !state.webhooksToDelete.includes(webhook.id)
        );
        draftState.webhooksToDelete = [];
        break;
      }
      case 'WEBHOOK_DELETED': {
        draftState.webhooks = state.webhooks.filter((_, index) => index !== action.index);
        draftState.webhookToDelete = null;

        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
