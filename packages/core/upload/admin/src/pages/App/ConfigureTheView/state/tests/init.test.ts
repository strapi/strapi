import { init } from '../init';

describe('Upload | ConfigureTheView | init', () => {
  it('should return the correct initialState', () => {
    const configData = { pageSize: 10, sort: 'createdAt:DESC' };
    const expected = {
      modifiedData: configData,
      initialData: configData,
    };

    const result = init(configData);

    expect(result).toEqual(expected);
  });
});
