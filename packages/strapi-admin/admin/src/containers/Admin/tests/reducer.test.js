import { fromJS, Map } from 'immutable';
import adminReducer from '../reducer';

describe('adminReducer', () => {
  let state;

  beforeEach(() => {
    state = fromJS({
      autoReload: false,
      appError: false,
      currentEnvironment: 'development',
      didGetSecuredData: false,
      isLoading: true,
      isSecured: false,
      layout: Map({}),
      securedData: {},
      showLogoutComponent: false,
      showMenu: true,
      strapiVersion: '3',
      uuid: false,
    });
  });

  it('returns the initial state', () => {
    expect(adminReducer(undefined, {})).toEqual(state);
  });
});
