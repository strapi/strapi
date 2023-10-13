export type Array = '$in' | '$notIn' | '$between';

export type Group = '$and' | '$or';

export type Logical = '$not';

export type BooleanValue = '$null' | '$notNull';

export type DynamicValue =
  | '$eq'
  | '$eqi'
  | '$ne'
  | '$nei'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$startsWith'
  | '$endsWith'
  | '$startsWithi'
  | '$endsWithi'
  | '$contains'
  | '$notContains'
  | '$containsi'
  | '$notContainsi';

export type DynamicArrayValue = '$in' | '$notIn';

export type DynamicBoundValue = '$between';

export type Where = BooleanValue | DynamicValue | DynamicArrayValue | DynamicBoundValue;
