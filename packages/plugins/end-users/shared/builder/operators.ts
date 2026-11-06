export type FilterableType =
  | 'string'
  | 'text'
  | 'richtext'
  | 'email'
  | 'uid'
  | 'enumeration'
  | 'date'
  | 'datetime'
  | 'time'
  | 'biginteger'
  | 'integer'
  | 'float'
  | 'decimal'
  | 'boolean';

const FLAG = ['$null', '$notNull'] as const;
const LIST = ['$in', '$notIn'] as const;
const PATTERN = [
  '$contains',
  '$notContains',
  '$containsi',
  '$notContainsi',
  '$startsWith',
  '$endsWith',
] as const;
const RANGE = ['$lt', '$lte', '$gt', '$gte'] as const;

/** What each type of field can be asked: one list for the admin and the server */
export const operatorsFor = (type: FilterableType): readonly string[] => {
  switch (type) {
    case 'boolean':
      return ['$eq', '$ne', ...FLAG];
    case 'enumeration':
      return ['$eq', '$ne', ...LIST, ...FLAG];
    case 'string':
    case 'text':
    case 'richtext':
    case 'email':
    case 'uid':
      return ['$eq', '$ne', ...PATTERN, ...LIST, ...FLAG];
    default:
      // Numbers and dates
      return ['$eq', '$ne', ...RANGE, ...LIST, ...FLAG];
  }
};

export const NEGATING_OPERATORS: readonly string[] = [
  '$ne',
  '$notIn',
  '$notContains',
  '$notContainsi',
];

export const PATTERN_OPERATORS: readonly string[] = PATTERN;

export const takesNoValue = (operator: string): boolean => FLAG.some((flag) => flag === operator);

export const takesList = (operator: string): boolean => LIST.some((list) => list === operator);
