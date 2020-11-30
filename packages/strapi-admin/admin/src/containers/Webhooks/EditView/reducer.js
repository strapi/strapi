import { fromJS } from 'immutable';
import { get } from 'lodash';

const header = { key: '', value: '' };

const initialWebhook = {
  events: [],
  headers: [header],
  name: '',
  url: '',
};

const initialState = fromJS({
  formErrors: {},
  initialData: initialWebhook,
  isTriggering: false,
  modifiedData: initialWebhook,
  isLoading: true,
  triggerResponse: {},
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NEW_HEADER':
      return state.updateIn(['modifiedData', ...action.keys], arr => arr.push(fromJS(header)));
    case 'GET_DATA_SUCCEEDED': {
      const headers = get(action, ['data', 'headers'], {});
      let formattedHeaders = [header];

      if (Object.keys(headers).length > 0) {
        formattedHeaders = Object.keys(headers).map(key => {
          return { key, value: headers[key] };
        });
      }

      const data = fromJS(action.data).update('headers', () => fromJS(formattedHeaders));

      return state
        .update('isLoading', () => false)
        .update('initialData', () => data)
        .update('modifiedData', () => data);
    }
    case 'ON_CHANGE':
      return state.updateIn(['modifiedData', ...action.keys], () => action.value);
    case 'ON_HEADER_REMOVE': {
      return state.updateIn(['modifiedData', 'headers'], headers => {
        if (headers.size === 1) {
          return fromJS([header]);
        }

        return headers.remove(action.index);
      });
    }
    case 'ON_TRIGGER_CANCELED':
      return state.update('isTriggering', () => false).set('triggerResponse', fromJS({}));
    case 'RESET_FORM':
      return state.update('modifiedData', () => state.get('initialData'));
    case 'SET_ERRORS':
      return state.update('formErrors', () => fromJS(action.errors));
    case 'SET_IS_TRIGGERING':
      return state.update('isTriggering', isTriggering => !isTriggering);
    case 'SUBMIT_SUCCEEDED':
      return state.update('initialData', () => state.get('modifiedData'));
    case 'TRIGGER_SUCCEEDED':
      return state
        .update('triggerResponse', () => fromJS(action.response))
        .update('isTriggering', () => false);
    case 'UNSET_LOADER':
      return state.update('isLoading', () => false);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
