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

  it('It should add new header to modifiedData on ADD_NEW_HEADER', () => {
    const state = initialState;

    const action = {
      type: 'ADD_NEW_HEADER',
      keys: ['headers'],
    };

    const updatedHeaders = state
      .getIn(['modifiedData', 'headers'])
      .push(fromJS(header));

    const expectedState = state.setIn(
      ['modifiedData', ...action.keys],
      updatedHeaders
    );

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('It should format headers as an array of an empty object if received headers is empty and update initialData and modifiedData states with received data on GET_DATA_SUCCEEDED', () => {
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

    const formattedHeaders = [header];
    const data = fromJS(receivedData).update('headers', () =>
      fromJS(formattedHeaders)
    );
    const expectedState = state
      .update('initialData', () => data)
      .update('modifiedData', () => data);

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('It should format headers as an array of objects if received headers is not empty and update initialData and modifiedData states with received data on GET_DATA_SUCCEEDED', () => {
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

    const headers = receivedData.headers;
    const formattedHeaders = Object.keys(headers).map(key => {
      return { key: key, value: headers[key] };
    });
    const data = fromJS(receivedData).update('headers', () =>
      fromJS(formattedHeaders)
    );
    const expectedState = state
      .update('initialData', () => data)
      .update('modifiedData', () => data);

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should update modifiedData with the right params on ON_CHANGE', () => {
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

  it('should remove a header to modifiedData on ON_HEADER_REMOVE if header is not the last', () => {
    const state = initialState;

    const action = {
      type: 'ON_HEADER_REMOVE',
      index: 1,
    };

    const expectedState = state.updateIn(
      ['modifiedData', 'headers'],
      headers => {
        return headers.remove(action.index);
      }
    );

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should clear a header to modifiedData on ON_HEADER_REMOVE if header is the last', () => {
    const state = initialState;

    const action = {
      type: 'ON_HEADER_REMOVE',
      index: 1,
    };

    const expectedState = state.updateIn(['modifiedData', 'headers'], () =>
      fromJS([header])
    );

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should update isTriggering and clear triggerResponse on ON_TRIGGER_CANCELED', () => {
    const state = initialState;

    const action = {
      type: 'ON_TRIGGER_CANCELED',
    };

    const expectedState = state
      .update('isTriggering', () => false)
      .update('triggerResponse', () => fromJS({}));

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should reset modifiedData with initialData values on RESET_FORM', () => {
    const state = initialState;

    const action = {
      type: 'RESET_FORM',
    };

    const expectedState = state.update('modifiedData', () =>
      state.get('initialData')
    );

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should update formErrors with the right params on SET_ERRORS', () => {
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

  it('should toggle isTriggering on SET_IS_TRIGGERING', () => {
    const state = initialState;

    const action = {
      type: 'SET_IS_TRIGGERING',
    };

    const expectedState = state.update(
      'isTriggering',
      isTriggering => !isTriggering
    );

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should update isTriggering and triggerResponse on TRIGGER_SUCCEEDED', () => {
    const state = initialState;

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
