import type { Modules } from '@strapi/types';
import type { MessageDescriptor } from 'react-intl';

/**
 * @description designed to be parsed by formatMessage from react-intl
 * then passed to a Select component.
 */
interface FilterOption {
  value: Modules.EntityService.Params.Filters.Operator.Where;
  label: MessageDescriptor;
}

/**
 * @description these are shared by everyone
 */
const BASE_FILTERS = [
  {
    label: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
    value: '$eq',
  },
  {
    label: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
    value: '$ne',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$null',
      defaultMessage: 'is null',
    },
    value: '$null',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$notNull',
      defaultMessage: 'is not null',
    },
    value: '$notNull',
  },
] satisfies FilterOption[];

/**
 * @description typically performed on attributes that are numerical incl. dates.
 */
const NUMERIC_FILTERS = [
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$gt',
      defaultMessage: 'is greater than',
    },
    value: '$gt',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$gte',
      defaultMessage: 'is greater than or equal to',
    },
    value: '$gte',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$lt',
      defaultMessage: 'is less than',
    },
    value: '$lt',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$lte',
      defaultMessage: 'is less than or equal to',
    },
    value: '$lte',
  },
] satisfies FilterOption[];

const IS_SENSITIVE_FILTERS = [
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$eqi',
      defaultMessage: 'is (case insensitive)',
    },
    value: '$eqi',
  },

  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$nei',
      defaultMessage: 'is not (case insensitive)',
    },
    value: '$nei',
  },
] satisfies FilterOption[];

/**
 * @description typically performed on attributes that are strings for partial looking.
 */
const CONTAINS_FILTERS = [
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$contains',
      defaultMessage: 'contains',
    },
    value: '$contains',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$containsi',
      defaultMessage: 'contains (case insensitive)',
    },
    value: '$containsi',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$notContains',
      defaultMessage: 'not contains',
    },
    value: '$notContains',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$notContainsi',
      defaultMessage: 'not contains (case insensitive)',
    },
    value: '$notContainsi',
  },
] satisfies FilterOption[];

/**
 * @description only used on string attributes.
 */
const STRING_PARSE_FILTERS = [
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$startsWith',
      defaultMessage: 'starts with',
    },
    value: '$startsWith',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$startsWithi',
      defaultMessage: 'starts with (case insensitive)',
    },
    value: '$startsWithi',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$endsWith',
      defaultMessage: 'ends with',
    },
    value: '$endsWith',
  },
  {
    label: {
      id: 'components.FilterOptions.FILTER_TYPES.$endsWithi',
      defaultMessage: 'ends with (case insensitive)',
    },
    value: '$endsWithi',
  },
] satisfies FilterOption[];

const FILTERS_WITH_NO_VALUE = ['$null', '$notNull'];

export {
  BASE_FILTERS,
  NUMERIC_FILTERS,
  IS_SENSITIVE_FILTERS,
  CONTAINS_FILTERS,
  STRING_PARSE_FILTERS,
  FILTERS_WITH_NO_VALUE,
};
export type { FilterOption };
