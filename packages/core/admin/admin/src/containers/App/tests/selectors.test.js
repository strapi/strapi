import { fromJS } from 'immutable';

import makeSelectApp, { selectApp } from '../selectors';

describe('<App /> selectors', () => {
  describe('selectApp', () => {
    it('should select the global state', () => {
      const appState = fromJS({});
      const mockedState = {
        app: appState,
      };

      expect(selectApp()(mockedState)).toEqual(appState);
    });
  });

  describe('makeSelectApp', () => {
    it('should select the appState (.toJS())', () => {
      const appState = fromJS({});
      const mockedState = {
        app: appState,
      };

      expect(makeSelectApp()(mockedState)).toEqual(appState.toJS());
    });
  });
});
