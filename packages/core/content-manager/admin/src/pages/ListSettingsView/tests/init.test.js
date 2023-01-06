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

    const result = init(initialState, layout);

    expect(result).toEqual(expected);
  });
});
