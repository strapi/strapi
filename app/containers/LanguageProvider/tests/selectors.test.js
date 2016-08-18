import {
  selectLanguage,
} from '../selectors';
import { fromJS } from 'immutable';
import expect from 'expect';

describe('selectLanguage', () => {
  const globalSelector = selectLanguage();
  it('should select the global state', () => {
    const globalState = fromJS({});
    const mockedState = fromJS({
      language: globalState,
    });
    expect(globalSelector(mockedState)).toEqual(globalState);
  });
});
