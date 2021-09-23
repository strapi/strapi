import reducer from '../reducer';

describe('Admin | containers | Webhooks | ListView | reducer', () => {
  const initialState = {
    webhooks: [],
    webhooksToDelete: [],
    webhookToDelete: null,
    loadingWebhooks: true,
  };

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

      const expectedState = { ...state, webhooks: receivedData, loadingWebhooks: false };

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });

  describe('Update webhook', () => {
    it('should toggle isEnabled parameter', () => {
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
      const state = { ...initialState, webhooks };

      const action = {
        type: 'SET_WEBHOOK_ENABLED',
        keys: [1, 'isEnabled'],
        value: true,
      };

      const expectedState = {
        ...state,
        webhooks: [
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
            isEnabled: true,
          },
        ],
      };

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });

  describe('Delete webhooks', () => {
    it('should set a webhook id to webhookToDelete', () => {
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
      const state = { ...initialState, webhooks };
      const action = {
        type: 'SET_WEBHOOK_TO_DELETE',
        id: 1,
      };

      const expectedState = { ...state, webhookToDelete: 1 };

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should add a webhook id to webhooksToDelete if value is true', () => {
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
      const state = { ...initialState, webhooks };
      const action = {
        type: 'SET_WEBHOOKS_TO_DELETE',
        id: 1,
        value: true,
      };

      const expectedState = { ...state, webhooksToDelete: [1] };

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should remove a webhook id to webhooksToDelete if value is false', () => {
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
      const state = { ...initialState, webhooks, webhooksToDelete: [1, 2] };

      const action = {
        type: 'SET_WEBHOOKS_TO_DELETE',
        id: 1,
        value: false,
      };

      const expectedState = { ...state, webhooksToDelete: [2] };

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

      const state = { ...initialState, webhooksToDelete: [1], webhooks };
      const action = {
        type: 'WEBHOOKS_DELETED',
      };

      const expectedState = { ...state, webhooks: updatedWebhooks, webhooksToDelete: [] };

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

      const state = { ...initialState, webhookToDelete: webhookIdToDelete, webhooks };

      const action = {
        type: 'WEBHOOK_DELETED',
        index: 1,
      };

      const expectedState = { ...state, webhooks: updatedWebhooks, webhookToDelete: null };

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should clear webhooksToDelete when webhooksToDelete length > 0', () => {
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

      const state = { ...initialState, webhooks, webhooksToDelete: [3] };

      const action = {
        type: 'SET_ALL_WEBHOOKS_TO_DELETE',
      };

      const expectedState = { ...state, webhooks, webhooksToDelete: [] };

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should add all webhooks in webhooksToDelete when webhooksToDelete length === 0', () => {
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

      const state = { ...initialState, webhooks, webhooksToDelete: [] };

      const action = {
        type: 'SET_ALL_WEBHOOKS_TO_DELETE',
      };

      const expectedState = { ...state, webhooks, webhooksToDelete: [3, 4, 5] };

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });
});
