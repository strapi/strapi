import { fromJS, Map } from 'immutable';

import makeSelectAdminDomain, { selectAdminDomain } from '../selectors';

describe('<Admin /> selectors', () => {
  describe('selectAdminDomain selector', () => {
    it('should select the global state', () => {
      const state = fromJS({
        autoReload: false,
        appError: false,
        currentEnvironment: 'development',
        isLoading: true,
        layout: Map({}),
        showLeftMenu: true,
        strapiVersion: '3',
        uuid: false,
      });
      const mockedState = fromJS({
        admin: state,
      });

      expect(selectAdminDomain()(mockedState)).toEqual(state);
    });
  });

  describe('makeSelectAdminDomain', () => {
    it('should select the global state (.toJS())', () => {
      const state = fromJS({
        autoReload: false,
        appError: false,
        currentEnvironment: 'development',
        isLoading: true,
        layout: Map({}),
        showLeftMenu: true,
        strapiVersion: '3',
        uuid: false,
      });
      const mockedState = fromJS({
        admin: state,
      });

      expect(makeSelectAdminDomain()(mockedState)).toEqual(state.toJS());
    });
  });
});
