import { fromJS } from 'immutable';
import reducer from '../reducer';

describe('Admin | containers | Webhooks | ListView | reducer', () => {
  const initialState = fromJS({
    webhooks: [
      {
        id: 1,
        name: 'webhook 1',
        url: 'http://localhost:5000',
        headers: {},
        events: ['entry.create', 'entry.update', 'entry.delete'],
        isEnabled: true,
      },
    ],
    webhooksToDelete: [],
    webhookToDelete: null,
  });
  it('It should update webhooks state with received data on GET_DATA_SUCCEEDED', () => {
    const state = initialState;
    const receivedData = [
      {
        id: 1,
        name: 'webhook 1',
        url: 'http://localhost:5000',
        headers: {},
        events: ['entry.create', 'entry.update', 'entry.delete'],
        isEnabled: true,
      },
      {
        id: 2,
        name: 'webhook 2',
        url: 'http://localhost:4000',
        headers: {},
        events: ['media.create', 'media.update'],
        isEnabled: false,
      },
    ];

    const action = {
      type: 'GET_DATA_SUCCEEDED',
      data: receivedData,
    };

    const expectedState = state.set('webhooks', fromJS(receivedData));

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('It should toggle webhook isEnabled state on SET_WEBHOOK_ENABLED', () => {
    const state = initialState;

    const webhookToUpdate = 1;
    const keys = [webhookToUpdate, 'isEnabled'];
    const action = {
      type: 'SET_WEBHOOK_ENABLED',
      keys: keys,
      value: false,
    };

    const expectedState = state.setIn(['webhooks', ...keys], action.value);
    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should set a webhook id to webhookToDelete on SET_WEBHOOK_TO_DELETE', () => {
    const state = initialState;

    const webhookToDelete = 1;
    const action = {
      type: 'SET_WEBHOOK_TO_DELETE',
      id: webhookToDelete,
    };

    const expectedState = state.set('webhookToDelete', action.id);
    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should add a webhook id to the webhookToDelete array on SET_WEBHOOKS_TO_DELETE if value is true', () => {
    const state = initialState;

    const webhookToDelete = 1;
    const action = {
      type: 'SET_WEBHOOKS_TO_DELETE',
      id: webhookToDelete,
      value: true,
    };

    const expectedState = state.set(
      'webhooksToDelete',
      state.get('webhooksToDelete').push(webhookToDelete)
    );
    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should remove a webhook id to the webhookToDelete array on SET_WEBHOOKS_TO_DELETE if value is false', () => {
    const state = initialState;

    const webhookToDelete = 1;
    const action = {
      type: 'SET_WEBHOOKS_TO_DELETE',
      id: webhookToDelete,
      value: false,
    };

    const expectedState = state.set(
      'webhooksToDelete',
      state.get('webhooksToDelete').remove(webhookToDelete)
    );
    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should update webhooks and empty webhooksToDelete on WEBHOOKS_DELETED', () => {
    const state = initialState;

    const action = {
      type: 'WEBHOOKS_DELETED',
    };

    const expectedState = state.set(
      'webhooksToDelete',
      initialState.get('webhooksToDelete')
    );
    expect(reducer(state, action)).toEqual(expectedState);
  });
});
