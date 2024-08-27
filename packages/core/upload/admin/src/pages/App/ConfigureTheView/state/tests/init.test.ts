import { init } from '../init';
import type { Configuration } from '../../../../../../../shared/contracts/configuration';

describe('Upload | ConfigureTheView | init', () => {
  it('should return the correct initialState', () => {
    const configData: Configuration = { pageSize: 10, sort: 'createdAt:DESC' };
    const expected = {
      modifiedData: configData,
      initialData: configData,
    };

    const result = init(configData);

    expect(result).toEqual(expected);
  });
});
