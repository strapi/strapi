import { Configuration } from '../../../../../../../shared/contracts/configuration';
import { init } from '../init';

describe('Upload | ConfigureTheView | init', () => {
  it('should return the correct initialState', () => {
    const configData: Configuration = { pageSize: 10, sort: 'createdAt:ASC' };
    const expected = {
      modifiedData: configData,
      initialData: configData,
    };

    const result = init(configData);

    expect(result).toEqual(expected);
  });
});
