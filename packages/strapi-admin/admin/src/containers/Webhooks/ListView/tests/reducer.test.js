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

    //expect(true).toBe(true);
  });
});
