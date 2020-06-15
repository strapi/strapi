import reducer from '../reducer';

describe('ADMIN | hooks | useSettingsMenu | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the state', () => {
      const initialState = {
        ok: true,
      };
      const expected = {
        ok: true,
      };

      expect(reducer(initialState, {})).toEqual(expected);
    });
  });

  describe('CHECK_PERMISSIONS_SUCCEEDED', () => {
    it('should set the permissions correctly', () => {
      const initialState = {
        isLoading: true,
        menu: [
          {
            id: 'global',
            links: [
              {
                to: 'global.test',
                isDisplayed: false,
              },
              {
                to: 'global.test2',
                isDisplayed: false,
              },
            ],
          },
          {
            id: 'test',
            links: [
              {
                to: 'test.test',
                isDisplayed: false,
              },
              {
                to: 'test.test2',
                isDisplayed: false,
              },
              {
                to: 'test.test3',
                isDisplayed: false,
              },
            ],
          },
          {
            id: 'test1',
            links: [
              {
                to: 'test1.test',
                isDisplayed: false,
              },
              {
                to: 'test1.test2',
                isDisplayed: false,
              },
              {
                to: 'test1.test3',
                isDisplayed: false,
              },
            ],
          },
        ],
      };
      const action = {
        type: 'CHECK_PERMISSIONS_SUCCEEDED',
        data: [
          { hasPermission: true, path: '1.links.0' },
          { hasPermission: true, path: '1.links.1' },
          { hasPermission: true, path: '0.links.1' },
          { hasPermission: undefined, path: '2.links.0' },
        ],
      };

      const expected = {
        isLoading: false,
        menu: [
          {
            id: 'global',
            links: [
              {
                to: 'global.test2',
                isDisplayed: true,
              },
            ],
          },
          {
            id: 'test',
            links: [
              {
                to: 'test.test',
                isDisplayed: true,
              },
              {
                to: 'test.test2',
                isDisplayed: true,
              },
            ],
          },
          {
            id: 'test1',
            links: [],
          },
        ],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
