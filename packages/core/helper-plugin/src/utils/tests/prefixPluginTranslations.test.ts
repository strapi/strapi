import { prefixPluginTranslations } from '../prefixPluginTranslations';

describe('prefixPluginTranslations', () => {
  it('should prefix plugin translations keys with plugin ID', () => {
    const trad = {
      key1: 'Value 1',
      key2: 'Value 2',
    };
    const pluginId = 'myPlugin';
    const expectedOutput = {
      'myPlugin.key1': 'Value 1',
      'myPlugin.key2': 'Value 2',
    };

    const result = prefixPluginTranslations(trad, pluginId);

    expect(result).toEqual(expectedOutput);
  });

  it('should return an empty object when given an empty object', () => {
    const trad = {};
    const pluginId = 'myPlugin';
    const expectedOutput = {};

    const result = prefixPluginTranslations(trad, pluginId);

    expect(result).toEqual(expectedOutput);
  });

  it('should throw TypeError if pluginId is provided as an empty string', () => {
    const trad = {
      key1: 'Value 1',
    };
    const pluginId = '';

    expect(() => {
      prefixPluginTranslations(trad, pluginId);
    }).toThrowError(new TypeError("pluginId can't be empty"));
  });
});
