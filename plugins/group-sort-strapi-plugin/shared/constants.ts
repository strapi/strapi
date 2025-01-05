export const PLUGIN_ID = 'group-arrange-strapi-plugin';
export const UNDEFINED_GROUP_NAME = 'undefined';
export const LOCAL_SETTINGS_KEY = 'GROUP_ARRANGE_STRAPI_PLUGIN__LOCAL_SETTINGS';

export const ORDERABLE_1D_FIELDS = ['number', 'integer', 'biginteger', 'float', 'decimal'];

export const ORDERABLE_2D_FIELDS = ['json'];

export const ORDERABLE_FIELDS = ORDERABLE_1D_FIELDS.concat(ORDERABLE_2D_FIELDS);

export const GROUPABLE_FIELDS = [
  'string',
  'text',
  'richtext',
  'email',
  'password',
  'date',
  'time',
  'datetime',
  'timestamp',
  'integer',
  'biginteger',
  'float',
  'decimal',
  'uid',
  'enumeration',
  'boolean',
  'json',
  'media',
  'relation',
  //'component',
  //'dynamiczone',
  //'blocks',
];

export const GROUPABLE_FIELDS_REQUIRING_POPULATE = ['relation', 'media'];