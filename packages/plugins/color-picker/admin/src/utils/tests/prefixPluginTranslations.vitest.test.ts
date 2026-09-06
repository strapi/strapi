import { describe, it, expect } from 'vitest';

import { prefixPluginTranslations } from '../prefixPluginTranslations';

describe('prefixPluginTranslations', () => {
  it('prefixes translation keys with plugin id', () => {
    const result = prefixPluginTranslations(
      {
        'color-picker.label': 'Color',
        'color-picker.description': 'Pick a color',
      },
      'color-picker'
    );

    expect(result).toEqual({
      'color-picker.color-picker.label': 'Color',
      'color-picker.color-picker.description': 'Pick a color',
    });
  });

  it('throws when pluginId is empty', () => {
    expect(() => prefixPluginTranslations({}, '')).toThrow("pluginId can't be empty");
  });
});
