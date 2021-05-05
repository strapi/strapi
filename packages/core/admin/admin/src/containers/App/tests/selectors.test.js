import { fromJS } from 'immutable';

import makeSelectApp, {
  selectApp,
  makeSelectBlockApp,
  makeSelectOverlayBlockerProps,
  makeSelectShowGlobalAppBlocker,
} from '../selectors';

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

  describe('makeSelectBlockApp', () => {
    it('should select the blockApp', () => {
      const mockedState = fromJS({
        app: {
          blockApp: true,
        },
      });

      expect(makeSelectBlockApp()(mockedState)).toEqual(true);
    });
  });

  describe('makeSelectOverlayBlockerProps', () => {
    it('should select the overlayBlockerData', () => {
      const overlayBlockerData = fromJS({ title: 'title' });
      const mockedState = {
        app: {
          overlayBlockerData,
        },
      };

      expect(makeSelectOverlayBlockerProps()(mockedState)).toEqual(overlayBlockerData);
    });
  });

  describe('makeSelectShowGlobalAppBlocker', () => {
    it('should select the showGlobalAppBlocker', () => {
      const mockedState = {
        app: {
          showGlobalAppBlocker: true,
        },
      };

      expect(makeSelectShowGlobalAppBlocker()(mockedState)).toEqual(true);
    });
  });
});
