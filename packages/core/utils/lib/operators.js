'use strict';

const GROUP_OPERATORS = ['$and', '$or'];

const WHERE_OPERATORS = [
  '$not',
  '$in',
  '$notIn',
  '$eq',
  '$eqi',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$null',
  '$notNull',
  '$between',
  '$startsWith',
  '$endsWith',
  '$startsWithi',
  '$endsWithi',
  '$contains',
  '$notContains',
  '$containsi',
  '$notContainsi',
];

const CAST_OPERATORS = [
  '$not',
  '$in',
  '$notIn',
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$between',
];

const ARRAY_OPERATORS = ['$in', '$notIn', '$between'];

const OPERATORS = {
  where: WHERE_OPERATORS,
  cast: CAST_OPERATORS,
  group: GROUP_OPERATORS,
  array: ARRAY_OPERATORS,
};

// for performance, cache all operators in lowercase
const OPERATORS_LOWERCASE = Object.fromEntries(
  Object.entries(OPERATORS).map(([key, values]) => [
    key,
    values.map((value) => value.toLowerCase()),
  ])
);

const isOperatorOfType = (type, key, ignoreCase = false) => {
  if (ignoreCase) {
    return OPERATORS_LOWERCASE[type]?.includes(key.toLowerCase()) ?? false;
  }
  return OPERATORS[type]?.includes(key) ?? false;
};

const isOperator = (key, ignoreCase = false) => {
  return Object.keys(OPERATORS).some((type) => isOperatorOfType(type, key, ignoreCase));
};

module.exports = {
  isOperator,
  isOperatorOfType,
  OPERATORS,
};
