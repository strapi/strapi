const JS_BUILT_IN_OBJECTS = [
  'boolean',
  'date',
  'error',
  'function',
  'infinity',
  'map',
  'math',
  'number',
  'object',
  'symbol',
];

const DB_RESERVED_SYNTAX = [
  'call',
  'case',
  'cast',
  'character',
  'exclusive',
  'global',
  'language',
  'national',
  'natural',
  'order',
  'procedure',
  'return',
  'space',
  'transaction',
  'trigger',
  'work',
  'zone',

];

const RESERVED_NAMES = [
  'admin',
  'series',
  'file',
  'news',
  ...JS_BUILT_IN_OBJECTS,
  ...DB_RESERVED_SYNTAX,
];

export default RESERVED_NAMES;
