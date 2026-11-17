/**
 * Every rule of the permission action registration schema, one row per input: whether
 * `validateRegisterProviderAction` accepts it, and the message it throws when it rejects it.
 *
 * `strapi.plugins` holds `my-plugin`, so `admin` and `my-plugin` are the existing plugin names.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { errors } from '@strapi/utils';

import { validateRegisterProviderAction } from '../action-provider';

type Case =
  | { name: string; input: unknown; verdict: 'accept' }
  | { name: string; input: unknown; verdict: 'reject'; message: string };

const settings = {
  section: 'settings',
  displayName: 'Export reports',
  uid: 'report.export',
  category: 'reports',
};
const plugins = { section: 'plugins', pluginName: 'my-plugin', displayName: 'Read', uid: 'read' };
const contentTypes = {
  section: 'contentTypes',
  displayName: 'Read',
  uid: 'read',
  subjects: ['api::article.article'],
};
const internal = { section: 'internal', displayName: 'Read', uid: 'read' };

const accept = (name: string, input: unknown): Case => ({ name, input, verdict: 'accept' });
const reject = (name: string, input: unknown, message: string): Case => ({
  name,
  input,
  verdict: 'reject',
  message,
});

const cases: Case[] = [
  // settings
  accept('settings with an admin pluginName', [
    { ...settings, pluginName: 'admin', subCategory: 'general' },
  ]),
  accept('settings without pluginName', [settings]),
  reject(
    'settings without category',
    [{ ...settings, category: undefined }],
    '[0].category is a required field'
  ),
  reject(
    'settings with an empty category',
    [{ ...settings, category: '' }],
    '[0].category is a required field'
  ),
  reject(
    'settings with subjects',
    [{ ...settings, subjects: ['api::article.article'] }],
    'subjects should only be defined for the "contentTypes" section'
  ),
  reject(
    'settings with null subjects',
    [{ ...settings, subjects: null }],
    'subjects should only be defined for the "contentTypes" section'
  ),
  reject(
    'settings with a null pluginName',
    [{ ...settings, pluginName: null }],
    '[0].pluginName must be a `string` type, but the final value was: `null`.'
  ),
  reject(
    'settings with a null subCategory',
    [{ ...settings, subCategory: null }],
    '[0].subCategory must be a `string` type, but the final value was: `null`.'
  ),

  // plugins
  reject(
    'plugins without pluginName (the documented example)',
    [{ section: 'plugins', displayName: 'Export reports', uid: 'report.export' }],
    '[0].pluginName is a required field'
  ),
  accept('plugins', [plugins]),
  accept('plugins with subCategory', [{ ...plugins, subCategory: 'general' }]),
  accept('plugins with an empty subCategory', [{ ...plugins, subCategory: '' }]),
  reject(
    'plugins with category',
    [{ ...plugins, category: 'general' }],
    'category should only be defined for the "settings" section'
  ),
  accept('plugins with an undefined category', [{ ...plugins, category: undefined }]),
  reject(
    'plugins with a null category',
    [{ ...plugins, category: null }],
    'category should only be defined for the "settings" section'
  ),
  reject(
    'plugins with an unknown pluginName',
    [{ ...plugins, pluginName: 'unknown-plugin' }],
    '[0].pluginName is not an existing plugin'
  ),
  reject('plugins with an empty pluginName', [{ ...plugins, pluginName: '' }], '2 errors occurred'),

  // contentTypes
  accept('contentTypes', [contentTypes]),
  accept('contentTypes with empty subjects', [{ ...contentTypes, subjects: [] }]),
  accept('contentTypes with an empty subject', [{ ...contentTypes, subjects: [''] }]),
  accept('contentTypes with an admin pluginName', [{ ...contentTypes, pluginName: 'admin' }]),
  reject(
    'contentTypes without subjects',
    [{ ...contentTypes, subjects: undefined }],
    '[0].subjects is a required field'
  ),
  reject(
    'contentTypes with null subjects',
    [{ ...contentTypes, subjects: null }],
    '[0].subjects must be a `array` type, but the final value was: `null`.'
  ),
  reject(
    'contentTypes with a non-string subject',
    [{ ...contentTypes, subjects: [1] }],
    '[0].subjects[0] must be a `string` type, but the final value was: `1`.'
  ),
  reject(
    'contentTypes with subCategory',
    [{ ...contentTypes, subCategory: 'general' }],
    'subCategory should only be defined for "plugins" and "settings" sections'
  ),

  // internal
  accept('internal', [internal]),
  reject(
    'internal with subCategory',
    [{ ...internal, subCategory: 'general' }],
    'subCategory should only be defined for "plugins" and "settings" sections'
  ),
  reject(
    'internal with an unknown pluginName',
    [{ ...internal, pluginName: 'unknown-plugin' }],
    '[0].pluginName is not an existing plugin'
  ),

  // section
  reject(
    'an unknown section',
    [{ ...internal, section: 'unknown' }],
    '[0].section must be one of the following values: contentTypes, plugins, settings, internal'
  ),
  reject(
    'a section in the wrong case',
    [{ ...internal, section: 'Internal' }],
    '[0].section must be one of the following values: contentTypes, plugins, settings, internal'
  ),
  reject(
    'a missing section',
    [{ ...internal, section: undefined }],
    '[0].section is a required field'
  ),

  // uid
  accept('a uid with a pipe', [{ ...plugins, uid: 'read|write' }]),
  accept('a uid with dashes and dots', [{ ...plugins, uid: 'read-only.item' }]),
  reject(
    'an uppercase uid',
    [{ ...plugins, uid: 'Read' }],
    '[0].uid: The uid can only contain lowercase letters, dots and hyphens.'
  ),
  reject(
    'a 2-character uid',
    [{ ...plugins, uid: 'ab' }],
    '[0].uid: The uid can only contain lowercase letters, dots and hyphens.'
  ),
  reject(
    'a number uid',
    [{ ...plugins, uid: 123 }],
    '[0].uid must be a `string` type, but the final value was: `123`.'
  ),

  // displayName
  reject(
    'an empty displayName',
    [{ ...plugins, displayName: '' }],
    '[0].displayName is a required field'
  ),
  reject(
    'a number displayName',
    [{ ...plugins, displayName: 1 }],
    '[0].displayName must be a `string` type, but the final value was: `1`.'
  ),

  // options
  accept('empty options', [{ ...plugins, options: {} }]),
  accept('options with an undefined applyToProperties', [
    { ...plugins, options: { applyToProperties: undefined } },
  ]),
  accept('options with an unknown key', [
    { ...plugins, options: { applyToProperties: ['fields'], unknown: true } },
  ]),
  reject(
    'options with a null applyToProperties',
    [{ ...plugins, options: { applyToProperties: null } }],
    '[0].options.applyToProperties must be a `array` type, but the final value was: `null`.'
  ),
  reject(
    'null options',
    [{ ...plugins, options: null }],
    '[0].options must be a `object` type, but the final value was: `null`.'
  ),

  // aliases
  accept('aliases', [
    { ...plugins, aliases: [{ actionId: 'plugin::my-plugin.write', subjects: ['api::a.a'] }] },
  ]),
  accept('an alias without actionId', [{ ...plugins, aliases: [{ subjects: ['api::a.a'] }] }]),
  accept('an alias with an empty actionId', [{ ...plugins, aliases: [{ actionId: '' }] }]),
  accept('an alias with null subjects', [
    { ...plugins, aliases: [{ actionId: 'plugin::my-plugin.write', subjects: null }] },
  ]),
  accept('an alias with an unknown key', [
    { ...plugins, aliases: [{ actionId: 'plugin::my-plugin.write', unknown: true }] },
  ]),
  accept('null aliases', [{ ...plugins, aliases: null }]),

  // item and list
  reject(
    'an unknown key',
    [{ ...plugins, unknown: true }],
    '[0] field has unspecified keys: unknown'
  ),
  reject(
    'two invalid fields in one item',
    [{ ...settings, category: undefined, displayName: 1 }],
    '2 errors occurred'
  ),
  reject('a null item', [null], '[0] must be a `object` type, but the final value was: `null`.'),
  accept('an empty list', []),
  reject(
    'an item instead of a list',
    internal,
    'this must be a `array` type, but the final value was: `{\n  "section": "\\"internal\\"",\n  "displayName": "\\"Read\\"",\n  "uid": "\\"read\\""\n}`.'
  ),
  reject('undefined', undefined, 'this is a required field'),
];

describe('validateRegisterProviderAction', () => {
  beforeEach(() => {
    global.strapi = { plugins: { 'my-plugin': {} } } as any;
  });

  test('the table covers 55 inputs', () => {
    expect(cases).toHaveLength(55);
  });

  test.each(cases.filter((c) => c.verdict === 'accept'))('accepts $name', ({ input }) => {
    expect(() => validateRegisterProviderAction(input)).not.toThrow();
  });

  test.each(cases.filter((c) => c.verdict === 'reject'))('rejects $name', (rejectCase) => {
    if (rejectCase.verdict !== 'reject') {
      throw new Error('expected a reject case');
    }

    let thrown: unknown;
    try {
      validateRegisterProviderAction(rejectCase.input);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(errors.ValidationError);
    expect(thrown).toHaveProperty('message', rejectCase.message);
    expect(thrown).toHaveProperty(
      'details.errors',
      expect.arrayContaining([expect.objectContaining({ name: 'ValidationError' })])
    );
  });

  test('names the missing pluginName of the documented plugins example', () => {
    expect(() =>
      validateRegisterProviderAction([
        { section: 'plugins', displayName: 'Export reports', uid: 'report.export' },
      ])
    ).toThrow(
      expect.objectContaining({
        name: 'ValidationError',
        details: {
          errors: [expect.objectContaining({ path: ['0', 'pluginName'] })],
        },
      })
    );
  });
});
