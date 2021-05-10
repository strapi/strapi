import { fromJS } from 'immutable';
import packageJSON from '../../../../../package.json';
import {
  getDataSucceeded,
  getInfosDataSucceeded,
  pluginDeleted,
  pluginLoaded,
  updatePlugin,
} from '../actions';
import appReducer from '../reducer';

describe('<App /> reducer', () => {
  let state;

  beforeEach(() => {
    state = fromJS({
      appInfos: {},
      autoReload: false,
      currentEnvironment: 'development',
      hasAdminUser: false,
      isLoading: true,
      plugins: {},
      strapiVersion: packageJSON.version,
      uuid: false,
    });
  });

  it('should return the initial state', () => {
    const expectedResult = state.toJS();
    expect(appReducer(undefined, {}).toJS()).toEqual(expectedResult);
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

  describe('GET_INFOS_DATA_SUCCEEDED', () => {
    it('should handle the set the data correctly', () => {
      const data = {
        autoReload: true,
        communityEdition: false,
        currentEnvironment: 'test',
        nodeVersion: 'v12.14.1',
        strapiVersion: '3.2.1',
      };
      const expected = state
        .set('appInfos', data)
        .set('autoReload', true)
        .set('currentEnvironment', 'test');

      expect(appReducer(state, getInfosDataSucceeded(data))).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should handle the set the data correctly', () => {
      const expected = state
        .set('hasAdminUser', true)
        .set('uuid', 'true')
        .set('isLoading', false);

      expect(appReducer(state, getDataSucceeded({ hasAdmin: true, uuid: 'true' }))).toEqual(
        expected
      );
    });
  });
});
