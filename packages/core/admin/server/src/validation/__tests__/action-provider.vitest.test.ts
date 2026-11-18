/**
 * Every rule of the permission action registration schema, one row per input: whether
 * `validateRegisterProviderAction` accepts it, and the message it throws when it rejects it.
 *
 * `strapi.plugins` holds `my-plugin`, so `admin` and `my-plugin` are the existing plugin names.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { errors } from '@strapi/utils';

import { validateRegisterProviderAction } from '../action-provider';
import createActionProvider from '../../domain/action/provider';

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
    '[0].category Invalid input: expected string, received undefined'
  ),
  reject(
    'settings with an empty category',
    [{ ...settings, category: '' }],
    '[0].category Too small: expected string to have >=1 characters'
  ),
  reject(
    'settings with subjects',
    [{ ...settings, subjects: ['api::article.article'] }],
    '[0].subjects should only be defined for the "contentTypes" section'
  ),
  reject(
    'settings with null subjects',
    [{ ...settings, subjects: null }],
    '[0].subjects should only be defined for the "contentTypes" section'
  ),
  reject(
    'settings with a null pluginName',
    [{ ...settings, pluginName: null }],
    '[0].pluginName Invalid input: expected string, received null'
  ),
  reject(
    'settings with a null subCategory',
    [{ ...settings, subCategory: null }],
    '[0].subCategory Invalid input: expected string, received null'
  ),

  // plugins
  reject(
    'plugins without pluginName (the documented example)',
    [{ section: 'plugins', displayName: 'Export reports', uid: 'report.export' }],
    '[0].pluginName Invalid input: expected string, received undefined'
  ),
  accept('plugins', [plugins]),
  accept('plugins with subCategory', [{ ...plugins, subCategory: 'general' }]),
  accept('plugins with an empty subCategory', [{ ...plugins, subCategory: '' }]),
  reject(
    'plugins with category',
    [{ ...plugins, category: 'general' }],
    '[0].category should only be defined for the "settings" section'
  ),
  accept('plugins with an undefined category', [{ ...plugins, category: undefined }]),
  reject(
    'plugins with a null category',
    [{ ...plugins, category: null }],
    '[0].category should only be defined for the "settings" section'
  ),
  reject(
    'plugins with an unknown pluginName',
    [{ ...plugins, pluginName: 'unknown-plugin' }],
    '[0].pluginName is not an existing plugin'
  ),
  reject(
    'plugins with an empty pluginName',
    [{ ...plugins, pluginName: '' }],
    '[0].pluginName is not an existing plugin'
  ),

  // contentTypes
  accept('contentTypes', [contentTypes]),
  accept('contentTypes with empty subjects', [{ ...contentTypes, subjects: [] }]),
  accept('contentTypes with an empty subject', [{ ...contentTypes, subjects: [''] }]),
  accept('contentTypes with an admin pluginName', [{ ...contentTypes, pluginName: 'admin' }]),
  accept('contentTypes with an undefined subject', [{ ...contentTypes, subjects: [undefined] }]),
  reject(
    'contentTypes without subjects',
    [{ ...contentTypes, subjects: undefined }],
    '[0].subjects Invalid input: expected array, received undefined'
  ),
  reject(
    'contentTypes with null subjects',
    [{ ...contentTypes, subjects: null }],
    '[0].subjects Invalid input: expected array, received null'
  ),
  reject(
    'contentTypes with a non-string subject',
    [{ ...contentTypes, subjects: [1] }],
    '[0].subjects[0] Invalid input: expected string, received number'
  ),
  reject(
    'contentTypes with subCategory',
    [{ ...contentTypes, subCategory: 'general' }],
    '[0].subCategory should only be defined for "plugins" and "settings" sections'
  ),

  // internal
  accept('internal', [internal]),
  reject(
    'internal with subCategory',
    [{ ...internal, subCategory: 'general' }],
    '[0].subCategory should only be defined for "plugins" and "settings" sections'
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
    "[0].section Invalid discriminator value. Expected 'contentTypes' | 'plugins' | 'settings' | 'internal'"
  ),
  reject(
    'a section in the wrong case',
    [{ ...internal, section: 'Internal' }],
    "[0].section Invalid discriminator value. Expected 'contentTypes' | 'plugins' | 'settings' | 'internal'"
  ),
  reject(
    'a missing section',
    [{ ...internal, section: undefined }],
    "[0].section Invalid discriminator value. Expected 'contentTypes' | 'plugins' | 'settings' | 'internal'"
  ),

  // uid
  accept('a uid with a pipe', [{ ...plugins, uid: 'read|write' }]),
  accept('a uid with dashes and dots', [{ ...plugins, uid: 'read-only.item' }]),
  reject(
    'an uppercase uid',
    [{ ...plugins, uid: 'Read' }],
    '[0].uid The uid can only contain lowercase letters, dots and hyphens.'
  ),
  reject(
    'a 2-character uid',
    [{ ...plugins, uid: 'ab' }],
    '[0].uid The uid can only contain lowercase letters, dots and hyphens.'
  ),
  reject(
    'a number uid',
    [{ ...plugins, uid: 123 }],
    '[0].uid Invalid input: expected string, received number'
  ),

  // displayName
  reject(
    'an empty displayName',
    [{ ...plugins, displayName: '' }],
    '[0].displayName Too small: expected string to have >=1 characters'
  ),
  reject(
    'a number displayName',
    [{ ...plugins, displayName: 1 }],
    '[0].displayName Invalid input: expected string, received number'
  ),

  // options
  accept('empty options', [{ ...plugins, options: {} }]),
  accept('options with an undefined applyToProperties', [
    { ...plugins, options: { applyToProperties: undefined } },
  ]),
  accept('options with an undefined property', [
    { ...plugins, options: { applyToProperties: [undefined] } },
  ]),
  accept('options with an unknown key', [
    { ...plugins, options: { applyToProperties: ['fields'], unknown: true } },
  ]),
  reject(
    'options with a null applyToProperties',
    [{ ...plugins, options: { applyToProperties: null } }],
    '[0].options.applyToProperties Invalid input: expected array, received null'
  ),
  reject(
    'null options',
    [{ ...plugins, options: null }],
    '[0].options Invalid input: expected object, received null'
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
  accept('an undefined alias', [{ ...plugins, aliases: [undefined] }]),
  accept('an alias with an undefined subject', [
    { ...plugins, aliases: [{ actionId: 'plugin::my-plugin.write', subjects: [undefined] }] },
  ]),

  // item and list
  reject('an unknown key', [{ ...plugins, unknown: true }], '[0] Unrecognized key: "unknown"'),
  reject(
    'two invalid fields in one item',
    [{ ...settings, category: undefined, displayName: 1 }],
    [
      '2 errors occurred:',
      '- [0].displayName Invalid input: expected string, received number',
      '- [0].category Invalid input: expected string, received undefined',
    ].join('\n')
  ),
  reject('a null item', [null], '[0] Invalid input: expected object, received null'),
  accept('an empty list', []),
  accept('an undefined item', [undefined]),
  reject('an item instead of a list', internal, 'Invalid input: expected array, received object'),
  reject('undefined', undefined, 'Invalid input: expected array, received undefined'),
];

describe('validateRegisterProviderAction', () => {
  beforeEach(() => {
    global.strapi = { plugins: { 'my-plugin': {} } } as any;
  });

  test('the table covers 60 inputs', () => {
    expect(cases).toHaveLength(60);
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

  describe('through the action provider', () => {
    const multiFaultMessage = [
      '3 errors occurred:',
      '- [0].uid The uid can only contain lowercase letters, dots and hyphens.',
      '- [0].pluginName Invalid input: expected string, received undefined',
      '- [1].category should only be defined for the "settings" section',
    ].join('\n');

    const multiFaultErrors = [
      expect.objectContaining({ path: ['0', 'uid'], value: 'Read' }),
      expect.objectContaining({ path: ['0', 'pluginName'], value: undefined }),
      expect.objectContaining({ path: ['1', 'category'], value: 'general' }),
    ];

    test('registerMany names every issue of every action', async () => {
      const actionProvider = createActionProvider();

      await expect(
        actionProvider.registerMany([
          { section: 'plugins', displayName: 'Read', uid: 'Read' },
          { ...plugins, category: 'general' },
        ] as any)
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: multiFaultMessage,
        details: { errors: multiFaultErrors },
      });
      expect(actionProvider.size()).toBe(0);
    });

    test('register names every issue of the action', async () => {
      const actionProvider = createActionProvider();

      await expect(
        actionProvider.register({
          section: 'plugins',
          displayName: 'Read',
          uid: 'Read',
          category: 'general',
        } as any)
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: [
          '3 errors occurred:',
          '- [0].uid The uid can only contain lowercase letters, dots and hyphens.',
          '- [0].pluginName Invalid input: expected string, received undefined',
          '- [0].category should only be defined for the "settings" section',
        ].join('\n'),
        details: {
          errors: [
            expect.objectContaining({ path: ['0', 'uid'], value: 'Read' }),
            expect.objectContaining({ path: ['0', 'pluginName'], value: undefined }),
            expect.objectContaining({ path: ['0', 'category'], value: 'general' }),
          ],
        },
      });
      expect(actionProvider.size()).toBe(0);
    });
  });
});
