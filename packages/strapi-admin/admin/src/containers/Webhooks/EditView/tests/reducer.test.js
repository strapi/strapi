import { fromJS } from 'immutable';
import reducer from '../reducer';

describe('Admin | containers | Webhooks | EditView | reducer', () => {
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
    triggerResponse: {},
  });

  describe('Format headers object', () => {
    it('should convert headers object to an array of an empty object if it is empty', () => {
      const state = initialState;

      const receivedData = {
        id: 1,
        name: 'webhook 1',
        url: 'http://localhost:5000',
        headers: {},
        events: ['entry.create', 'entry.update', 'entry.delete'],
        isEnabled: true,
      };

      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: receivedData,
      };

      const data = { ...receivedData, headers: [header] };
      const expectedState = state
        .set('initialData', fromJS(data))
        .set('modifiedData', fromJS(data));

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should convert headers object to an array of objects if it is not empty', () => {
      const state = initialState;

      const receivedData = {
        id: 1,
        name: 'webhook 1',
        url: 'http://localhost:5000',
        headers: {
          accept: 'text/html',
          authorization: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l',
        },
        events: ['entry.create', 'entry.update', 'entry.delete'],
        isEnabled: true,
      };

      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: receivedData,
      };

      const formattedHeaders = [
        { key: 'accept', value: 'text/html' },
        { key: 'authorization', value: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l' },
      ];

      const data = { ...receivedData, headers: formattedHeaders };

      const expectedState = state
        .update('initialData', () => fromJS(data))
        .update('modifiedData', () => fromJS(data));

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });

  describe('Update Webhook', () => {
    it('should update modifiedData properly on change', () => {
      const state = initialState;

      const action = {
        type: 'ON_CHANGE',
        keys: ['name'],
        value: 'new webhook name',
      };

      const expectedState = state.setIn(
        ['modifiedData', ...action.keys],
        action.value
      );

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should add header to modifiedData correctly', () => {
      const state = initialState;

      const action = {
        type: 'ADD_NEW_HEADER',
        keys: ['headers'],
      };

      const expectedState = state.setIn(
        ['modifiedData', 'headers'],
        fromJS([
          { key: '', value: '' },
          { key: '', value: '' },
        ])
      );

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should remove header from modifiedData if it is not the last', () => {
      const initialHeaders = [
        { key: 'accept', value: 'text/html' },
        { key: 'authorization', value: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l' },
      ];
      const state = initialState
        .setIn(['initialData', 'headers'], fromJS(initialHeaders))
        .setIn(['modifiedData', 'headers'], fromJS(initialHeaders));

      const action = {
        type: 'ON_HEADER_REMOVE',
        index: 1,
      };

      const updatedHeaders = [{ key: 'accept', value: 'text/html' }];

      const expectedState = state.setIn(
        ['modifiedData', 'headers'],
        fromJS(updatedHeaders)
      );

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should clear a header to modifiedData if it is the last', () => {
      const initialHeaders = [{ key: 'accept', value: 'text/html' }];
      const state = initialState
        .setIn(['initialData', 'headers'], fromJS(initialHeaders))
        .setIn(['modifiedData', 'headers'], fromJS(initialHeaders));

      const action = {
        type: 'ON_HEADER_REMOVE',
        index: 0,
      };

      const updatedHeaders = [header];

      const expectedState = state.setIn(
        ['modifiedData', 'headers'],
        fromJS(updatedHeaders)
      );

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });

  describe('Trigger actions', () => {
    it('should set isTriggering to false when trigger action is canceled', () => {
      const state = initialState.set('isTriggering', true);

      const action = {
        type: 'ON_TRIGGER_CANCELED',
      };

      const expectedState = state.update('isTriggering', () => false);

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should clear triggerResponse when trigger action is canceled', () => {
      const state = initialState.set('triggerResponse', {
        statusCode: 200,
        message: 'succeed',
      });

      const action = {
        type: 'ON_TRIGGER_CANCELED',
      };

      const expectedState = state.update('triggerResponse', () => fromJS({}));

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should toggle isTriggering value', () => {
      const state = initialState;

      const action = {
        type: 'SET_IS_TRIGGERING',
      };

      const expectedState = state.set('isTriggering', true);

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should update isTriggering and triggerResponse if trigger succeed', () => {
      const state = initialState.set('isTriggering', true);

      const action = {
        type: 'TRIGGER_SUCCEEDED',
        response: {
          statusCode: 200,
          message: 'succeed',
        },
      };

      const expectedState = state
        .update('triggerResponse', () => fromJS(action.response))
        .update('isTriggering', () => false);

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });

  describe('Reset form', () => {
    it('should reset modifiedData with initialData values', () => {
      const state = initialState
        .setIn(['modifiedData', 'name'], 'updated name')
        .setIn(['modifiedData', 'url'], 'updated url');

      const action = {
        type: 'RESET_FORM',
      };

      const expectedState = state.update('modifiedData', () =>
        state.get('initialData')
      );

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });

  describe('Set validation errors', () => {
    it('should update formErrors with the right params', () => {
      const state = initialState;

      const action = {
        type: 'SET_ERRORS',
        errors: {
          name: 'The value is required',
        },
      };

      const expectedState = state.update('formErrors', () =>
        fromJS(action.errors)
      );

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });
});
