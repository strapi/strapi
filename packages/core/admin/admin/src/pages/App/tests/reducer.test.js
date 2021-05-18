import packageJSON from '../../../../../package.json';
import { getDataSucceeded, getInfosDataSucceeded } from '../actions';
import appReducer from '../reducer';

describe('<App /> reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      appInfos: {},
      autoReload: false,
      currentEnvironment: 'development',
      isLoading: true,
      strapiVersion: packageJSON.version,
      uuid: false,
    };
  });

  it('should return the initial state', () => {
    expect(appReducer(undefined, {})).toEqual(state);
  });

  describe('GET_INFOS_DATA_SUCCEEDED', () => {
    it('should handle the set the data correctly', () => {
      const data = {
        autoReload: true,
        communityEdition: false,
        currentEnvironment: 'test',
        nodeVersion: 'v12.14.1',
        strapiVersion: packageJSON.version,
      };

      const expected = { ...state, appInfos: data, autoReload: true, currentEnvironment: 'test' };

      expect(appReducer(state, getInfosDataSucceeded(data))).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should handle the set the data correctly', () => {
      const expected = { ...state, uuid: 'true', isLoading: false };

      expect(appReducer(state, getDataSucceeded({ hasAdmin: true, uuid: 'true' }))).toEqual(
        expected
      );
    });
  });
});
