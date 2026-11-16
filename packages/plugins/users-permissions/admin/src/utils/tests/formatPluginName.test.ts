import { describe, expect, it } from 'vitest';

import { formatPluginName } from '../formatPluginName';

describe('permission plugin labels', () => {
  it.each([
    ['application', 'Application'],
    ['plugin::content-manager', 'Content manager'],
    ['plugin::content-type-builder', 'Content types builder'],
    ['plugin::documentation', 'Documentation'],
    ['plugin::email', 'Email'],
    ['plugin::i18n', 'i18n'],
    ['plugin::upload', 'Media Library'],
    ['plugin::users-permissions', 'Users-permissions'],
    ['api::article', 'Article'],
    ['plugin::custom', 'Custom'],
  ])('labels %s as %s', (slug, label) => {
    expect(formatPluginName(slug)).toBe(label);
  });
});
