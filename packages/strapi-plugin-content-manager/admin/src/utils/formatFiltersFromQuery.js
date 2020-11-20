// List of all the possible filters
const VALID_REST_OPERATORS = [
  'eq',
  'ne',
  'in',
  'nin',
  'contains',
  'ncontains',
  'containss',
  'ncontainss',
  'lt',
  'lte',
  'gt',
  'gte',
  'null',
];

// from strapi-utims/convert-rest-query-params
const findAppliedFilter = whereClause => {
  const separatorIndex = whereClause.lastIndexOf('_');

  if (separatorIndex === -1) {
    return { operator: '=', field: whereClause };
  }

  const fieldName = whereClause.substring(0, separatorIndex);
  const operator = whereClause.slice(separatorIndex + 1);

  // the field as underscores
  if (!VALID_REST_OPERATORS.includes(operator)) {
    return { operator: '=', field: whereClause };
  }

  return { operator: `_${operator}`, field: fieldName };
};

const formatFiltersFromQuery = ({ _where }) => {
  if (!_where) {
    return [];
  }

  return _where.map(obj => {
    const [key] = Object.keys(obj);
    const { field, operator } = findAppliedFilter(key);

    const value = obj[key];

    return { name: field, filter: operator, value };
  });
};

export default formatFiltersFromQuery;
export { findAppliedFilter };
