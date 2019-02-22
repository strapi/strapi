
import { fromJS, Map } from 'immutable';

import {
  getInitDataSucceeded,
  hideLeftMenu,
  setAppError,
  showLeftMenu,
} from '../actions';
import adminReducer from '../reducer';

describe('adminReducer', () => {
  let state;

  beforeEach(() => {
    state = fromJS({
      autoReload: false,
      appError: false,
      currentEnvironment: 'development',
      isLoading: true,
      layout: Map({}),
      showMenu: true,
      strapiVersion: '3',
      uuid: false,
    });
  });

  it('returns the initial state', () => {
    const expected = state;

    expect(adminReducer(undefined, {})).toEqual(expected);
  });

  it('should handle the getAdminDataSucceeded action correctly', () => {
    const data = {
      autoReload: { enabled: true },
      currentEnvironment: 'production',
      isLoading: false,
      layout: {},
      strapiVersion: '3.0.0-beta',
      uuid: 'uuid',
    };
    const expected = state
      .set('autoReload', true)
      .set('currentEnvironment', 'production')
      .set('isLoading', false)
      .set('layout', Map({}))
      .set('strapiVersion', '3.0.0-beta')
      .set('uuid', 'uuid');

    expect(adminReducer(state, getInitDataSucceeded(data))).toEqual(expected);
  });

  it('should handle the hideLeftMenu action correctly', () => {
    const expected = state.set('showMenu', false);

    expect(adminReducer(state, hideLeftMenu())).toEqual(expected);
  });

  it('should handle the setaAppError action correctly', () => {
    const expected = state.set('appError', true);

    expect(adminReducer(state, setAppError())).toEqual(expected);
  });

  it('should handle the showLeftMenu action correctly', () => {
    const expected = state.set('showMenu', true);
    state.set('showMenu', false);

    expect(adminReducer(state, showLeftMenu())).toEqual(expected);
  });
});
