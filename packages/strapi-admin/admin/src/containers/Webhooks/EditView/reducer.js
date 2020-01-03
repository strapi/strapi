import { fromJS } from 'immutable';
import { cloneDeep, set, get } from 'lodash';

const initialWebhook = {
  name: null,
  url: null,
  headers: [{ key: '', value: '' }],
};

const initialState = fromJS({
  initialWebhook: initialWebhook,
  modifiedWebhook: initialWebhook,
  shouldRefetchData: false,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED': {
      const data = cloneDeep(action.data);
      const headers = get(data, 'headers');

      if (Object.keys(headers).length > 0) {
        const newHeaders = fromJS(
          Object.keys(headers).map(key => {
            return { key: key, value: headers[key] };
          })
        );

        set(data, ['headers'], newHeaders);
      }

      return state
        .update('initialWebhook', () => fromJS(data))
        .update('modifiedWebhook', () => fromJS(data))
        .update('shouldRefetchData', () => false);
    }
    case 'ON_CHANGE': {
      return state.updateIn(
        ['modifiedWebhook', ...action.keys],
        () => action.value
      );
    }
    case 'ADD_NEW_HEADER':
      return state.updateIn(['modifiedWebhook', ...action.keys], arr =>
        arr.push(fromJS({ key: '', value: '' }))
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
