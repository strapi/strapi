import { fromJS } from 'immutable';

import makeSelectLocaleToggle, { selectLocaleToggle } from '../selectors';

describe('<LocaleToggle /> selectors', () => {
  describe('selectLocaleToggle selector', () => {
    it('should select the global state', () => {
      const state = fromJS({
        className: null,
      });
      const mockedState = fromJS({
        localeToggle: state,
      });
      
      expect(selectLocaleToggle()(mockedState)).toEqual(state);
    });
  });

  describe('makeSelectLocaleToggle', () => {
    it('should select the global state (.toJS())', () => {
      const state = fromJS({
        className: null,
      });
      const mockedState = fromJS({
        localeToggle: state,
      });

      expect(makeSelectLocaleToggle()(mockedState)).toEqual(state.toJS());
    });
  });
});


