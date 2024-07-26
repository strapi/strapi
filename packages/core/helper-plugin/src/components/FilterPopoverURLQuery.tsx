import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Popover,
  PopoverProps,
  DatePicker,
  DateTimePicker,
  Field,
  FieldInput,
  NumberInput,
  TimePicker,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import formatISO from 'date-fns/formatISO';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useTracking } from '../features/Tracking';
import { useQueryParams } from '../hooks/useQueryParams';

import type { DefaultFilterInputsProps, Filter, FilterData, Operator } from '../types';
import type { EntityService } from '@strapi/types';

export interface FilterPopoverURLQueryProps extends Pick<PopoverProps, 'source'> {
  displayedFilters: FilterData[];
  isVisible: boolean;
  onBlur?: () => void;
  onToggle: () => void;
}

export const FilterPopoverURLQuery = ({
  displayedFilters,
  isVisible,
  onBlur,
  onToggle,
  source,
}: FilterPopoverURLQueryProps) => {
  const [{ query }, setQuery] = useQueryParams<{
    filters: {
      $and: Filter[];
    };
    page: number;
  }>();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const defaultFieldSchema = { fieldSchema: { type: 'string' } };
  const [modifiedData, setModifiedData] = React.useState<{
    name: string;
    filter: EntityService.Params.Filters.Operator.Where;
    value: string | null;
  }>({
    name: displayedFilters[0]?.name || '',
    filter: getFilterList((displayedFilters[0] || defaultFieldSchema).fieldSchema)[0].value,
    value: '',
  });

  if (!isVisible) {
    return null;
  }

  if (displayedFilters.length === 0) {
    return null;
  }

  const handleChangeFilterField = (value: string) => {
    const nextField = displayedFilters.find((f) => f.name === value);

    if (!nextField) return;

    const {
      fieldSchema: { type, options },
    } = nextField;
    let filterValue = '';

    if (type === 'boolean') {
      filterValue = 'true';
    }

    if (type === 'enumeration' && Array.isArray(options)) {
      filterValue = options[0];
    }

    const filter = getFilterList(nextField.fieldSchema)[0].value;

    setModifiedData({ name: value, filter, value: filterValue });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const hasFilter =
      query?.filters?.$and.find((filter) => {
        return (
          filter[modifiedData.name] &&
          filter[modifiedData.name]?.[modifiedData.filter] === modifiedData.value
        );
      }) !== undefined;

    if (modifiedData.value && !hasFilter) {
      const foundAttribute = displayedFilters.find(({ name }) => name === modifiedData.name);

      if (foundAttribute) {
        if (foundAttribute.trackedEvent) {
          trackUsage(foundAttribute.trackedEvent.name, foundAttribute.trackedEvent.properties);
        }

        let filterToAdd: Filter;

        if (
          foundAttribute.fieldSchema.type === 'relation' &&
          foundAttribute.fieldSchema.mainField
        ) {
          filterToAdd = {
            [modifiedData.name]: {
              [foundAttribute.fieldSchema.mainField.name]: {
                [modifiedData.filter]: modifiedData.value,
              },
            },
          } as Filter;
        } else {
          filterToAdd = {
            [modifiedData.name]: { [modifiedData.filter]: modifiedData.value },
          } as Filter;
        }

        const filters = [...(query?.filters?.$and || []), filterToAdd];

        setQuery({ filters: { $and: filters }, page: 1 });
      }
    }
    onToggle();
  };

  const handleChangeOperator = (operator: EntityService.Params.Filters.Operator.Where) => {
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

  const appliedFilter = displayedFilters.find((filter) => filter.name === modifiedData.name)!;
  const operator = modifiedData.filter;
  const filterList =
    appliedFilter.metadatas.customOperators || getFilterList(appliedFilter.fieldSchema);
  const Inputs = appliedFilter.metadatas.customInput || DefaultInputs;

  return (
    <Popover source={source} onDismiss={onToggle} padding={3} spacing={4} onBlur={onBlur}>
      <form onSubmit={handleSubmit}>
        <Flex direction="column" alignItems="stretch" gap={1} style={{ minWidth: 184 }}>
          <SelectContainers direction="column" alignItems="stretch" gap={1}>
            <SingleSelect
              label={formatMessage({
                id: 'app.utils.select-field',
                defaultMessage: 'Select field',
              })}
              name="name"
              size="M"
              // @ts-expect-error from the DS V2 this won't be needed because we're only returning strings.
              onChange={handleChangeFilterField}
              value={modifiedData.name}
            >
              {displayedFilters.map((filter) => {
                return (
                  <SingleSelectOption key={filter.name} value={filter.name}>
                    {filter.metadatas.label}
                  </SingleSelectOption>
                );
              })}
            </SingleSelect>
            <SingleSelect
              label={formatMessage({
                id: 'app.utils.select-filter',
                defaultMessage: 'Select filter',
              })}
              name="filter"
              size="M"
              value={modifiedData.filter}
              onChange={(value) =>
                // TODO: we should do an assertion function to ensure the value is a valid operator
                handleChangeOperator(value as EntityService.Params.Filters.Operator.Where)
              }
            >
              {filterList.map((option) => {
                return (
                  <SingleSelectOption key={option.value} value={option.value}>
                    {formatMessage(option.intlLabel)}
                  </SingleSelectOption>
                );
              })}
            </SingleSelect>
          </SelectContainers>
          {operator !== '$null' && operator !== '$notNull' && (
            <Box>
              <Inputs
                label={appliedFilter.metadatas.label}
                type={appliedFilter.fieldSchema.type}
                options={appliedFilter.fieldSchema.options ?? appliedFilter.metadatas.options}
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

const DefaultInputs = ({
  label = '',
  onChange,
  type,
  value = '',
  ...restProps
}: DefaultFilterInputsProps) => {
  const { formatMessage } = useIntl();

  if (type === 'boolean') {
    return (
      <SingleSelect aria-label={label} onChange={(value) => onChange(String(value))} value={value}>
        <SingleSelectOption value="true">true</SingleSelectOption>
        <SingleSelectOption value="false">false</SingleSelectOption>
      </SingleSelect>
    );
  }

  if (type === 'date') {
    return (
      // @ts-expect-error – in V2 of the DS we won't pass label because this will become input only & a label breaks the design
      <DatePicker
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        ariaLabel={label}
        name="datepicker"
        onChange={(date) => onChange(date ? formatISO(date, { representation: 'date' }) : null)}
        onClear={() => onChange(null)}
        selectedDate={value ? new Date(value) : undefined}
      />
    );
  }

  if (type === 'datetime') {
    return (
      // @ts-expect-error – in V2 of the DS we won't pass label because this will become input only & a label breaks the design
      <DateTimePicker
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        ariaLabel={label}
        name="datetimepicker"
        // check if date is not null or undefined
        onChange={(date) => onChange(date ? date.toISOString() : null)}
        onClear={() => onChange(null)}
        value={value ? new Date(value) : undefined}
      />
    );
  }

  if (type === 'enumeration') {
    const options = (restProps.options as FilterData['fieldSchema']['options']) ?? [];
    return (
      // @ts-expect-error from the DS V2 this won't be needed because we're only returning strings.
      <SingleSelect aria-label={label} onChange={onChange} value={value}>
        {options.map((optionValue) => {
          return (
            <SingleSelectOption key={optionValue} value={optionValue}>
              {optionValue}
            </SingleSelectOption>
          );
        })}
      </SingleSelect>
    );
  }

  if (['float', 'integer', 'biginteger', 'decimal'].includes(type)) {
    return (
      <NumberInput
        aria-label={label}
        name="filter-value"
        onValueChange={(value) => onChange(value ? String(value) : null)}
        // @ts-expect-error – we need to refactor this component so it's a discriminated union where the attribute type dictates the value type.
        value={value || 0}
      />
    );
  }

  if (type === 'time') {
    return (
      // @ts-expect-error – in V2 of the DS we won't pass label because this will become input only & a label breaks the design
      <TimePicker
        aria-label={label}
        onClear={() => onChange('')}
        onChange={(value) => onChange(value ? value : null)}
        value={value ?? undefined}
        clearLabel="Clear the selected time picker value"
      />
    );
  }

  return (
    <Field>
      <FieldInput
        aria-label={formatMessage({ id: 'app.utils.filter-value', defaultMessage: 'Filter value' })}
        onChange={({ target: { value } }) => onChange(value)}
        value={value ?? undefined}
        size="M"
      />
    </Field>
  );
};

/**
 * Depending on the selected field find the possible filters to apply
 */
const getFilterList = (filterSchema: FilterData['fieldSchema']): Operator[] => {
  let type = filterSchema.type;

  if (filterSchema.type === 'relation' && filterSchema?.mainField?.type) {
    type = filterSchema.mainField.type;
  }

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
