import { fromJS } from 'immutable';
import makeSelectModelPageDomain, { selectModelPageDomain } from '../selectors';
import pluginId from '../../../pluginId';


describe('<ModelPage />, selectors', () => {
  describe('makeSelectModelPageDomain', () => {
    it('should return the globalState (.toJS())', () => {
      const mockedState = fromJS({
        [`${pluginId}_modelPage`]: fromJS({}),
      });
  
      expect(makeSelectModelPageDomain()(mockedState)).toEqual({});
    });
  });

  describe('selectModelPageDomain', () => {
    it('should return the globalState', () => {
      const mockedState = fromJS({
        [`${pluginId}_modelPage`]: fromJS({}),
      });
  
      expect(selectModelPageDomain()(mockedState)).toEqual(fromJS({}));
    });
  });

});
