import { fromJS } from 'immutable';
import makeSelectInitializerDomain, { selectInitializerDomain } from '../selectors';
import pluginId from '../../../pluginId';

describe('<Initializer /> selectors', () => {
  describe('selectInitializerDomain', () => {
    it('should select the global state', () => {
      const initializerState = fromJS({});
      const mockedState = fromJS({
        [`${pluginId}_initializer`]: initializerState,
      });

      expect(selectInitializerDomain()(mockedState)).toEqual(initializerState);
    });
  });

  describe('makeSelectInitiazerDomain', () => {
    it('should select the global state (.toJS())', () => {
      const initializerState = fromJS({});
      const mockedState = fromJS({
        [`${pluginId}_initializer`]: initializerState,
      });

      expect(makeSelectInitializerDomain()(mockedState)).toEqual(initializerState.toJS());
    });
  });
});
