import { GET_DATA_SUCCEEDED } from '../constants';
import { getDataSucceeded } from '../actions';

describe('<App /> actions', () => {
  describe('getDataSucceeded', () => {
    it('shoudl return the correct type and the passed data', () => {
      const data = { ok: true };
      const expected = {
        type: GET_DATA_SUCCEEDED,
        data,
      };

      expect(getDataSucceeded(data)).toEqual(expected);
    });
  });
});
