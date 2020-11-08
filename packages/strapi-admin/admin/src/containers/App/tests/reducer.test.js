import { fromJS } from 'immutable';
import packageJSON from '../../../../../package.json';
import {
  disableGlobalOverlayBlocker,
  enableGlobalOverlayBlocker,
  freezeApp,
  pluginDeleted,
  pluginLoaded,
  unfreezeApp,
  unsetHasUserPlugin,
  updatePlugin,
} from '../actions';
import appReducer from '../reducer';

describe('<App /> reducer', () => {
  let state;

  beforeEach(() => {
    state = fromJS({
      autoReload: false,
      blockApp: false,
      currentEnvironment: 'development',
      hasAdminUser: false,
      hasUserPlugin: true,
      isLoading: true,
      overlayBlockerData: null,
      plugins: {},
      showGlobalAppBlocker: true,
      strapiVersion: packageJSON.version,
      uuid: false,
    });
  });

  it('should return the initial state', () => {
    const expectedResult = state;
    expect(appReducer(undefined, {})).toEqual(expectedResult);
  });

  it('should handle the disableGlobalOverlayBlocker action correctly', () => {
    const expectedResult = state.set('showGlobalAppBlocker', false);
    expect(appReducer(state, disableGlobalOverlayBlocker())).toEqual(expectedResult);
  });

  it('should handle the enableGlobalOverlayBlocker action correctly', () => {
    state = state.set('showGlobalAppBlocker', false);
    const expectedResult = state.set('showGlobalAppBlocker', true);
    expect(appReducer(state, enableGlobalOverlayBlocker())).toEqual(expectedResult);
  });

  it('should handle the freezeApp action correctly and set the overlayBlockerData key if passed data', () => {
    const expectedResult = state
      .set('blockApp', true)
      .set('overlayBlockerData', { title: 'A title' });
    expect(appReducer(state, freezeApp({ title: 'A title' }))).toEqual(expectedResult);
  });

  it('should handle the freezeApp action correctly and NOT set the overlayBlockerData key if no passed data', () => {
    const expectedResult = state.set('blockApp', true);

    expect(appReducer(state, freezeApp())).toEqual(expectedResult);
  });

  it('should handle the pluginLoaded action correclty', () => {
    const plugin = {
      id: 'content-manager',
      description: 'Manage your content',
    };
    const expectedResult = state.setIn(['plugins', 'content-manager'], fromJS(plugin));

    expect(appReducer(state, pluginLoaded(plugin))).toEqual(expectedResult);
  });

  it('should handle the updatePlugin action correclty', () => {
    const plugin = { id: 'content-manager', isReady: false };
    state = state.setIn(['plugins', 'content-manager'], fromJS(plugin));

    const expectedResult = state.setIn(['plugins', 'content-manager', 'isReady'], true);

    expect(appReducer(state, updatePlugin('content-manager', 'isReady', true))).toEqual(
      expectedResult
    );
  });

  it('should handle the pluginDeleted action correclty', () => {
    const plugin = { id: 'content-manager', isReady: false };
    state = state.setIn(['plugins', 'content-manager'], fromJS(plugin));
    const expectedResult = state.deleteIn(['plugins', 'content-manager']);

    expect(appReducer(state, pluginDeleted('content-manager'))).toEqual(expectedResult);
  });

  it('should handle the unfreezeApp action correclty', () => {
    state = state.set('blockApp', true).set('overlayBlockerData', { foo: 'bar' });
    const expectedResult = state.set('blockApp', false).set('overlayBlockerData', null);

    expect(appReducer(state, unfreezeApp())).toEqual(expectedResult);
  });

  it('should handle the unsetHasUserPlugin action correclty', () => {
    const expectedResult = state.set('hasUserPlugin', false);

    expect(appReducer(state, unsetHasUserPlugin())).toEqual(expectedResult);
  });
});
