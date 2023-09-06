/**
 *
 * FilterPopoverURLQuery
 *
 */

import React, { useState } from 'react';

import {
  Box,
  Button,
  Flex,
  Option,
  Popover,
  Select,
  DatePicker,
  DateTimePicker,
  Field,
  FieldInput,
  NumberInput,
  TimePicker,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import formatISO from 'date-fns/formatISO';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useTracking } from '../features/Tracking';
import { useQueryParams } from '../hooks/useQueryParams';

export const FilterPopoverURLQuery = ({
  displayedFilters,
  isVisible,
  onBlur,
  onToggle,
  source,
}) => {
  const [{ query }, setQuery] = useQueryParams();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const defaultFieldSchema = { fieldSchema: { type: 'string' } };
  const [modifiedData, setModifiedData] = useState({
    name: displayedFilters[0]?.name || '',
    filter: getFilterList(displayedFilters[0] || defaultFieldSchema)[0].value,
    value: '',
  });

  if (!isVisible) {
    return null;
  }

  if (displayedFilters.length === 0) {
    return null;
  }

  const handleChangeFilterField = (value) => {
    const nextField = displayedFilters.find((f) => f.name === value);
    const {
      fieldSchema: { type, options },
    } = nextField;
    let filterValue = '';

    if (type === 'boolean') {
      filterValue = 'true';
    }

    if (type === 'enumeration') {
      filterValue = options?.[0];
    }

    const filter = getFilterList(nextField)[0].value;

    setModifiedData({ name: value, filter, value: filterValue });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const hasFilter =
      query?.filters?.$and.find((filter) => {
        return (
          filter[modifiedData.name] &&
          filter[modifiedData.name]?.[modifiedData.filter] === modifiedData.value
        );
      }) !== undefined;

    if (modifiedData.value && !hasFilter) {
      let filterToAdd = { [modifiedData.name]: { [modifiedData.filter]: modifiedData.value } };

      const foundAttribute = displayedFilters.find(({ name }) => name === modifiedData.name);

      const type = foundAttribute.fieldSchema.type;

      if (foundAttribute.trackedEvent) {
        trackUsage(foundAttribute.trackedEvent.name, foundAttribute.trackedEvent.properties);
      }

      if (type === 'relation') {
        filterToAdd = {
          [modifiedData.name]: {
            [foundAttribute.fieldSchema.mainField.name]: {
              [modifiedData.filter]: modifiedData.value,
            },
          },
        };
      }

      const filters = [...(query?.filters?.$and || []), filterToAdd];

      setQuery({ filters: { $and: filters }, page: 1 });
    }
    onToggle();
  };

  const handleChangeOperator = (operator) => {
    if (operator === '$null' || operator === '$notNull') {
      setModifiedData((prev) => ({
        ...prev,
        value: 'true',
        filter: operator,
      }));

      return;
    }

    setModifiedData((prev) => ({ ...prev, filter: operator, value: '' }));
  };

  const appliedFilter = displayedFilters.find((filter) => filter.name === modifiedData.name);
  const operator = modifiedData.filter;
  const filterList = appliedFilter.metadatas.customOperators || getFilterList(appliedFilter);
  const Inputs = appliedFilter.metadatas.customInput || DefaultInputs;

  return (
    <Popover source={source} onDismiss={onToggle} padding={3} spacing={4} onBlur={onBlur}>
      <form onSubmit={handleSubmit}>
        <Flex direction="column" alignItems="stretch" gap={1} style={{ minWidth: 184 }}>
          <SelectContainers direction="column" alignItems="stretch" gap={1}>
            <Select
              label={formatMessage({
                id: 'app.utils.select-field',
                defaultMessage: 'Select field',
              })}
              name="name"
              size="M"
              onChange={handleChangeFilterField}
              value={modifiedData.name}
            >
              {displayedFilters.map((filter) => {
                return (
                  <Option key={filter.name} value={filter.name}>
                    {filter.metadatas.label}
                  </Option>
                );
              })}
            </Select>
            <Select
              label={formatMessage({
                id: 'app.utils.select-filter',
                defaultMessage: 'Select filter',
              })}
              name="filter"
              size="M"
              value={modifiedData.filter}
              onChange={handleChangeOperator}
            >
              {filterList.map((option) => {
                return (
                  <Option key={option.value} value={option.value}>
                    {formatMessage(option.intlLabel)}
                  </Option>
                );
              })}
            </Select>
          </SelectContainers>
          {operator !== '$null' && operator !== '$notNull' && (
            <Box>
              <Inputs
                {...appliedFilter.metadatas}
                {...appliedFilter.fieldSchema}
                value={modifiedData.value}
                onChange={(value) => setModifiedData((prev) => ({ ...prev, value }))}
              />
            </Box>
          )}
          <Box>
            <Button size="L" variant="secondary" startIcon={<Plus />} type="submit" fullWidth>
              {formatMessage({ id: 'app.utils.add-filter', defaultMessage: 'Add filter' })}
            </Button>
          </Box>
        </Flex>
      </form>
    </Popover>
  );
};

FilterPopoverURLQuery.defaultProps = {
  onBlur: undefined,
};

FilterPopoverURLQuery.propTypes = {
  displayedFilters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      metadatas: PropTypes.shape({ label: PropTypes.string }),
      fieldSchema: PropTypes.shape({ type: PropTypes.string }),
      // Send event to the tracker
      trackedEvent: PropTypes.shape({
        name: PropTypes.string.isRequired,
        properties: PropTypes.object,
      }),
    })
  ).isRequired,
  isVisible: PropTypes.bool.isRequired,
  onBlur: PropTypes.func,
  onToggle: PropTypes.func.isRequired,
  source: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
};

const SelectContainers = styled(Flex)`
  /* Hide the label, every input needs a label. */
  label {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
`;

const DefaultInputs = ({ label, onChange, options, type, value }) => {
  const { formatMessage } = useIntl();

  if (type === 'boolean') {
    return (
      <Select
        // FIXME: stop errors in the console
        aria-label={label}
        onChange={onChange}
        value={value}
      >
        <Option value="true">true</Option>
        <Option value="false">false</Option>
      </Select>
    );
  }

  if (type === 'date') {
    return (
      <DatePicker
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        ariaLabel={label}
        name="datepicker"
        onChange={(date) => onChange(formatISO(date, { representation: 'date' }))}
        onClear={() => onChange(null)}
        selectedDate={value ? new Date(value) : undefined}
        selectedDateLabel={(formattedDate) => `Date picker, current is ${formattedDate}`}
      />
    );
  }

  if (type === 'datetime') {
    return (
      <DateTimePicker
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        ariaLabel={label}
        name="datetimepicker"
        // check if date is not null or undefined
        onChange={(date) => onChange(date ? date.toISOString() : null)}
        onClear={() => onChange(null)}
        value={value ? new Date(value) : undefined}
        selectedDateLabel={(formattedDate) => `Date picker, current is ${formattedDate}`}
        selectButtonTitle={formatMessage({ id: 'selectButtonTitle', defaultMessage: 'Select' })}
      />
    );
  }

  if (type === 'enumeration') {
    return (
      <Select
        // FIXME: stop errors in the console
        aria-label={label}
        onChange={onChange}
        value={value}
      >
        {options.map((optionValue) => {
          return (
            <Option key={optionValue} value={optionValue}>
              {optionValue}
            </Option>
          );
        })}
      </Select>
    );
  }

  if (['float', 'integer', 'biginteger', 'decimal'].includes(type)) {
    return (
      <NumberInput
        aria-label={label}
        name="filter-value"
        onValueChange={onChange}
        value={value || 0}
      />
    );
  }

  if (type === 'time') {
    return (
      <TimePicker
        aria-label={label}
        onClear={() => onChange('')}
        onChange={onChange}
        value={value}
        clearLabel="Clear the selected time picker value"
      />
    );
  }

  return (
    <Field>
      <FieldInput // FIXME: stop errors in the console
        aria-label={formatMessage({ id: 'app.utils.filter-value', defaultMessage: 'Filter value' })}
        onChange={({ target: { value } }) => onChange(value)}
        value={value}
        size="M"
      />
    </Field>
  );
};

DefaultInputs.defaultProps = {
  label: '',
  options: [],
  value: '',
};

DefaultInputs.propTypes = {
  label: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string),
  type: PropTypes.string.isRequired,
  value: PropTypes.any,
};

/**
 * Depending on the selected field find the possible filters to apply
 * @param {Object} fieldSchema.type the type of the filter
 * @returns {Object[]}
 */
const getFilterList = ({ fieldSchema: { type: fieldType, mainField } }) => {
  const type = mainField?.schema?.type ?? fieldType;

  switch (type) {
    case 'email':
    case 'text':
    case 'enumeration':
    case 'string': {
      return [
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
          value: '$eq',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$eqi',
            defaultMessage: 'is (case insensitive)',
          },
          value: '$eqi',
        },
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
          value: '$ne',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$nei',
            defaultMessage: 'is not (case insensitive)',
          },
          value: '$nei',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$null',
            defaultMessage: 'is null',
          },
          value: '$null',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notNull',
            defaultMessage: 'is not null',
          },
          value: '$notNull',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$contains',
            defaultMessage: 'contains',
          },
          value: '$contains',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$containsi',
            defaultMessage: 'contains (case insensitive)',
          },
          value: '$containsi',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notContains',
            defaultMessage: 'not contains',
          },
          value: '$notContains',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notContainsi',
            defaultMessage: 'not contains (case insensitive)',
          },
          value: '$notContainsi',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$startsWith',
            defaultMessage: 'starts with',
          },
          value: '$startsWith',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$startsWithi',
            defaultMessage: 'starts with (case insensitive)',
          },
          value: '$startsWithi',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$endsWith',
            defaultMessage: 'ends with',
          },
          value: '$endsWith',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$endsWithi',
            defaultMessage: 'ends with (case insensitive)',
          },
          value: '$endsWithi',
        },
      ];
    }

    case 'float':
    case 'integer':
    case 'biginteger':
    case 'decimal': {
      return [
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
          value: '$eq',
        },
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
          value: '$ne',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$null',
            defaultMessage: 'is null',
          },
          value: '$null',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notNull',
            defaultMessage: 'is not null',
          },
          value: '$notNull',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$gt',
            defaultMessage: 'is greater than',
          },
          value: '$gt',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$gte',
            defaultMessage: 'is greater than or equal to',
          },
          value: '$gte',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$lt',
            defaultMessage: 'is less than',
          },
          value: '$lt',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$lte',
            defaultMessage: 'is less than or equal to',
          },
          value: '$lte',
        },
      ];
    }
    case 'time':
    case 'date': {
      return [
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
          value: '$eq',
        },
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
          value: '$ne',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$null',
            defaultMessage: 'is null',
          },
          value: '$null',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notNull',
            defaultMessage: 'is not null',
          },
          value: '$notNull',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$contains',
            defaultMessage: 'contains (sensitive)',
          },
          value: '$contains',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notContains',
            defaultMessage: 'not contains (sensitive)',
          },
          value: '$notContains',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$gt',
            defaultMessage: 'is greater than',
          },
          value: '$gt',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$gte',
            defaultMessage: 'is greater than or equal to',
          },
          value: '$gte',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$lt',
            defaultMessage: 'is less than',
          },
          value: '$lt',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$lte',
            defaultMessage: 'is less than or equal to',
          },
          value: '$lte',
        },
      ];
    }

    case 'datetime': {
      return [
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
          value: '$eq',
        },
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
          value: '$ne',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$null',
            defaultMessage: 'is null',
          },
          value: '$null',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notNull',
            defaultMessage: 'is not null',
          },
          value: '$notNull',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$gt',
            defaultMessage: 'is greater than',
          },
          value: '$gt',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$gte',
            defaultMessage: 'is greater than or equal to',
          },
          value: '$gte',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$lt',
            defaultMessage: 'is less than',
          },
          value: '$lt',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$lte',
            defaultMessage: 'is less than or equal to',
          },
          value: '$lte',
        },
      ];
    }

    default:
      return [
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
          value: '$eq',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$eqi',
            defaultMessage: 'is (case insensitive)',
          },
          value: '$eqi',
        },
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
          value: '$ne',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$null',
            defaultMessage: 'is null',
          },
          value: '$null',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notNull',
            defaultMessage: 'is not null',
          },
          value: '$notNull',
        },
      ];
  }
};
