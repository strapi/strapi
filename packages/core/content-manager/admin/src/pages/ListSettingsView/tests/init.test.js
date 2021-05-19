import { fromJS } from 'immutable';
import init from '../init';

describe('CONTENT MANAGER | containers | ListSettingsView | init', () => {
  it('should return the correct initialState', () => {
    const initialState = { test: true };
    const layout = { foo: 'bar' };
    const expected = {
      test: true,
      modifiedData: { foo: 'bar' },
      initialData: { foo: 'bar' },
    };

    const result = init(fromJS(initialState), layout).toJS();

    expect(result).toEqual(expected);
  });
});
