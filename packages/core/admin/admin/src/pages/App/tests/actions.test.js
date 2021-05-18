import { GET_DATA_SUCCEEDED, GET_INFOS_DATA_SUCCEEDED } from '../constants';
import { getInfosDataSucceeded, getDataSucceeded } from '../actions';

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

  describe('getInfosDataSucceeded', () => {
    it('shoudl return the correct type and the passed data', () => {
      const data = { ok: true };
      const expected = {
        type: GET_INFOS_DATA_SUCCEEDED,
        data,
      };

      expect(getInfosDataSucceeded(data)).toEqual(expected);
    });
  });
});
