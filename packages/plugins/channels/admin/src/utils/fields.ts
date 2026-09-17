/**
 * Attribute types whose per-field settings modal gets the channel options.
 * `password` and `uid` are excluded (never overridable); relations ARE
 * overridable per channel (top-level only — the codec refuses relations
 * inside components).
 */
export const OVERRIDABLE_FIELDS = [
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
  'relation',
  'richtext',
  'blocks',
  'string',
  'text',
  'time',
];
