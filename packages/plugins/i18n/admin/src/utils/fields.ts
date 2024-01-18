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
): opts is { i18n: { localized: boolean } } =>
  typeof opts === 'object' &&
  opts !== null &&
  'i18n' in opts &&
  typeof opts.i18n === 'object' &&
  opts.i18n !== null &&
  'localized' in opts.i18n &&
  typeof opts.i18n.localized === 'boolean';

export { LOCALIZED_FIELDS, doesPluginOptionsHaveI18nLocalized };
