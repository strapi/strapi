import { fromJS } from 'immutable';

import makeSelectApp, {
  selectApp,
  selectHasUserPlugin,
  selectPlugins,
  makeSelectAppPlugins,
  makeSelectBlockApp,
  makeSelectOverlayBlockerProps,
  makeSelectIsAppLoading,
  makeSelectShowGlobalAppBlocker,
} from '../selectors';

describe('<App /> selectors', () => {
  describe('selectApp', () => {
    it('should select the global state', () => {
      const appState = fromJS({});
      const mockedState = fromJS({
        app: appState,
      });

      expect(selectApp()(mockedState)).toEqual(appState);
    });
  });

  describe('makeSelectApp', () => {
    it('should select the appState (.toJS())', () => {
      const appState = fromJS({});
      const mockedState = fromJS({
        app: appState,
      });

      expect(makeSelectApp()(mockedState)).toEqual(appState.toJS());
    });
  });

  describe('selectHasUserPlugin', () => {
    it('should select the hasUserPlugin', () => {
      const appState = fromJS({
        hasUserPlugin: true,
      });
      const mockedState = fromJS({
        app: appState,
      });

      expect(selectHasUserPlugin()(mockedState)).toEqual(true);
    });
  });

  describe('selectPlugins', () => {
    it('should select the plugins', () => {
      const plugins = fromJS({ email: { isReady: true } });
      const mockedState = fromJS({
        app: {
          plugins,
        },
      });

      expect(selectPlugins()(mockedState)).toEqual(plugins);
    });
  });

  describe('makeSelectAppPlugins', () => {
    it('should select the appPlugins', () => {
      const plugins = ['email'];
      const mockedState = fromJS({
        app: {
          appPlugins: plugins,
        },
      });

      expect(makeSelectAppPlugins()(mockedState)).toEqual(plugins);
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
      const mockedState = fromJS({
        app: {
          overlayBlockerData,
        },
      });

      expect(makeSelectOverlayBlockerProps()(mockedState)).toEqual(
        overlayBlockerData,
      );
    });
  });

  describe('makeSelectIsAppLoading', () => {
    it('should select the isAppLoading', () => {
      const mockedState = fromJS({
        app: {
          isAppLoading: true,
        },
      });

      expect(makeSelectIsAppLoading()(mockedState)).toEqual(true);
    });
  });

  describe('makeSelectShowGlobalAppBlocker', () => {
    it('should select the showGlobalAppBlocker', () => {
      const mockedState = fromJS({
        app: {
          showGlobalAppBlocker: true,
        },
      });

      expect(makeSelectShowGlobalAppBlocker()(mockedState)).toEqual(true);
    });
  });
});
