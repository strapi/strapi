import produce from 'immer';
import get from 'lodash/get';
import set from 'lodash/set';

const header = { key: '', value: '' };

const initialWebhook = {
  events: [],
  headers: [header],
  name: '',
  url: '',
};

const initialState = {
  formErrors: {},
  initialData: initialWebhook,
  isTriggering: false,
  modifiedData: initialWebhook,
  isLoading: true,
  triggerResponse: {},
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ADD_NEW_HEADER': {
        draftState.modifiedData.headers.push(header);
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        const headers = get(action, ['data', 'headers'], {});
        let formattedHeaders = [header];

        if (Object.keys(headers).length > 0) {
          formattedHeaders = Object.keys(headers).map((key) => {
            return { key, value: headers[key] };
          });
        }

        const data = { ...action.data, headers: formattedHeaders };

        draftState.isLoading = false;
        draftState.initialData = data;
        draftState.modifiedData = data;

        break;
      }
      case 'ON_CHANGE': {
        set(draftState, ['modifiedData', ...action.keys], action.value);
        break;
      }
      case 'ON_HEADER_REMOVE': {
        const nextHeaders = state.modifiedData.headers.filter((_, index) => index !== action.index);

        if (!nextHeaders.length) {
          nextHeaders.push(header);
        }

        draftState.modifiedData.headers = nextHeaders;
        break;
      }
      case 'ON_TRIGGER_CANCELED': {
        draftState.isTriggering = false;
        draftState.triggerResponse = {};

        break;
      }
      case 'RESET_FORM': {
        draftState.modifiedData = state.initialData;
        break;
      }
      case 'SET_ERRORS': {
        draftState.formErrors = action.errors;
        break;
      }
      case 'SET_IS_TRIGGERING': {
        draftState.isTriggering = !state.isTriggering;
        break;
      }
      case 'SUBMIT_SUCCEEDED': {
        draftState.initialData = state.modifiedData;
        break;
      }
      case 'TRIGGER_SUCCEEDED': {
        draftState.triggerResponse = action.response;
        draftState.isTriggering = false;
        break;
      }
      case 'UNSET_LOADER': {
        draftState.isLoading = false;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
