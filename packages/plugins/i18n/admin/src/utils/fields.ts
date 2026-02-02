import has from 'lodash/has';

const LOCALIZED_FIELDS = [
  'biginteger',
  'boolean',
  'component',
  'date',
  'datetime',
  'decimal',
  'dynamiczone',
  'email',
  'enumeration',
  'float',
  'integer',
  'json',
  'media',
  'number',
  'password',
  'richtext',
  'blocks',
  'string',
  'text',
  'time',
];

const doesPluginOptionsHaveI18nLocalized = (
  opts?: object
): opts is { i18n: { localized: boolean } } => has(opts, ['i18n', 'localized']);

export { LOCALIZED_FIELDS, doesPluginOptionsHaveI18nLocalized };
