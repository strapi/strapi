import produce from 'immer';
import packageJSON from '../../../../../package.json';
import { setAppError, getStrapiLatestReleaseSucceeded } from '../actions';
import adminReducer from '../reducer';

describe('adminReducer', () => {
  let state;

  beforeEach(() => {
    state = {
      appError: false,
      latestStrapiReleaseTag: `v${packageJSON.version}`,
      shouldUpdateStrapi: false,
    };
  });

  it('should set the latest release version', () => {
    const expected = produce(state, draft => {
      draft.shouldUpdateStrapi = true;
      draft.latestStrapiReleaseTag = 'v3.3.4';
    });

    expect(adminReducer(state, getStrapiLatestReleaseSucceeded('v3.3.4', true))).toEqual(expected);
  });

  it('returns the initial state', () => {
    const expected = state;

    expect(adminReducer(undefined, {})).toEqual(expected);
  });

  it('should handle the setAppError action correctly', () => {
    const expected = produce(state, draft => {
      draft.appError = true;
    });

    expect(adminReducer(state, setAppError())).toEqual(expected);
  });
});
