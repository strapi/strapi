import { fromJS } from 'immutable';
import reducer from '../reducer';

describe('Admin | containers | Webhooks | ListView | reducer', () => {
  const initialState = fromJS({
    webhooks: [],
    webhooksToDelete: [],
    webhookToDelete: null,
  });

  describe('Load webhooks', () => {
    it('should update webhooks with received data', () => {
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
  });

  describe('Update webhook', () => {
    it('should toggle isEnabled parameter', () => {
      const state = initialState;
      const webhookToUpdate = 1;
      const keys = [webhookToUpdate, 'isEnabled'];
      const action = {
        type: 'SET_WEBHOOK_ENABLED',
        keys,
        value: false,
      };

      const expectedState = state.setIn(['webhooks', ...keys], action.value);
      expect(reducer(state, action)).toEqual(expectedState);
    });
  });

  describe('Delete webhooks', () => {
    it('should set a webhook id to webhookToDelete', () => {
      const state = initialState;
      const webhookToDelete = 1;
      const action = {
        type: 'SET_WEBHOOK_TO_DELETE',
        id: webhookToDelete,
      };

      const expectedState = state.set('webhookToDelete', action.id);
      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should add a webhook id to webhooksToDelete if value is true', () => {
      const state = initialState;
      const webhookToDelete = 1;
      const action = {
        type: 'SET_WEBHOOKS_TO_DELETE',
        id: webhookToDelete,
        value: true,
      };

      const expectedState = state.set(
        'webhooksToDelete',
        fromJS([...state.get('webhooksToDelete'), webhookToDelete])
      );
      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should remove a webhook id to webhooksToDelete if value is false', () => {
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

    it('should update webhooks and clear webhooksToDelete', () => {
      const webhooks = [
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
      const updatedWebhooks = [
        {
          id: 2,
          name: 'webhook 2',
          url: 'http://localhost:4000',
          headers: {},
          events: ['media.create', 'media.update'],
          isEnabled: false,
        },
      ];

      const state = initialState
        .set('webhooksToDelete', [1])
        .set('webhooks', fromJS(webhooks));
      const action = {
        type: 'WEBHOOKS_DELETED',
      };

      const expectedState = state
        .set('webhooks', fromJS(updatedWebhooks))
        .set('webhooksToDelete', []);
      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should update webhooks and clear webhookToDelete', () => {
      const webhooks = [
        {
          id: 3,
          name: 'webhook 1',
          url: 'http://localhost:5000',
          headers: {},
          events: ['entry.create', 'entry.update', 'entry.delete'],
          isEnabled: true,
        },
        {
          id: 4,
          name: 'webhook 2',
          url: 'http://localhost:4000',
          headers: {},
          events: ['media.create', 'media.update'],
          isEnabled: false,
        },
        {
          id: 5,
          name: 'webhook 2',
          url: 'http://localhost:4000',
          headers: {},
          events: ['media.create', 'media.update'],
          isEnabled: false,
        },
      ];
      const updatedWebhooks = [
        {
          id: 3,
          name: 'webhook 1',
          url: 'http://localhost:5000',
          headers: {},
          events: ['entry.create', 'entry.update', 'entry.delete'],
          isEnabled: true,
        },
        {
          id: 5,
          name: 'webhook 2',
          url: 'http://localhost:4000',
          headers: {},
          events: ['media.create', 'media.update'],
          isEnabled: false,
        },
      ];

      const webhookIdToDelete = 4;

      const state = initialState
        .set('webhookToDelete', webhookIdToDelete)
        .set('webhooks', fromJS(webhooks));

      const action = {
        type: 'WEBHOOK_DELETED',
        index: webhooks.findIndex(webhook => webhook.id === webhookIdToDelete),
      };

      const expectedState = state
        .set('webhooks', fromJS(updatedWebhooks))
        .set('webhookToDelete', null);
      expect(reducer(state, action)).toEqual(expectedState);
    });
  });
});
