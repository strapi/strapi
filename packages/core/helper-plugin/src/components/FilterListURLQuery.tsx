import * as React from 'react';

import { Box, Tag } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useQueryParams } from '../hooks/useQueryParams';

import type { FilterData } from 'types';

export interface Filter {
  [key: string]: {
    [key: string]: string | Record<string, string>;
  };
}

export type FilterContent = FilterData<
  {
    customValue?: string;
    label?: string;
  }[]
>;

export interface FilterListURLQueryProps {
  filtersSchema: FilterContent[];
}

export const FilterListURLQuery = ({ filtersSchema = [] }: FilterListURLQueryProps) => {
  const [{ query }, setQuery] = useQueryParams<{
    filters?: {
      $and?: Filter[];
    };
    page?: number;
  }>();

  /*
  TODO: This is a temporary fix to avoid a typescript error when I try to access the $and property. But I don't think it's right.
  I need some comments in the PR to find a better solution.
  */

  const handleClick = (filter: Filter) => {
    const nextFilters = (query?.filters?.$and || []).filter((prevFilter: Filter) => {
      const name = Object.keys(filter)[0];
      const filterType = Object.keys(filter[name])[0];
      const value = filter[name][filterType];

      return prevFilter[name]?.[filterType] !== value;
    });

    setQuery({ filters: { $and: nextFilters }, page: 1 });
  };

  return (
    query?.filters?.$and?.map((filter: Filter, i: number) => {
      const attributeName = Object.keys(filter)[0];
      const attribute = filtersSchema.find(({ name }) => name === attributeName);

      if (!attribute) {
        return null;
      }

      if (attribute.fieldSchema.type === 'relation') {
        const relationTargetAttribute = attribute.fieldSchema.mainField.name;
        const filterObj = filter[attributeName][relationTargetAttribute];
        const operator = Object.keys(filterObj)[0];
        const value = typeof filterObj === 'object' ? filterObj[operator] : '';

        return (
          <AttributeTag
            // eslint-disable-next-line react/no-array-index-key
            key={`${attributeName}-${i}`}
            attribute={attribute}
            filter={filter}
            onClick={handleClick}
            operator={operator}
            value={value}
          />
        );
      }

      const filterObj = filter[attributeName];
      const operator = Object.keys(filterObj)[0];
      const value = filterObj[operator];

      return (
        <AttributeTag
          // eslint-disable-next-line react/no-array-index-key
          key={`${attributeName}-${i}`}
          attribute={attribute}
          filter={filter}
          onClick={handleClick}
          operator={operator}
          value={typeof value === 'string' ? value : ''}
        />
      );
    }) || null
  );
};

interface AttributeTagProps {
  attribute: FilterContent;
  filter: Filter;
  onClick: (filter: Filter) => void;
  operator: string;
  value: string;
}

const AttributeTag = ({ attribute, filter, onClick, operator, value }: AttributeTagProps) => {
  const { formatMessage, formatDate, formatTime, formatNumber } = useIntl();

  const handleClick = () => {
    onClick(filter);
  };

  const { fieldSchema } = attribute;

  const type = fieldSchema?.mainField?.schema?.type || fieldSchema.type;

  let formattedValue = value;

  if (type === 'date') {
    formattedValue = formatDate(value, { dateStyle: 'full' });
  }

  if (type === 'datetime') {
    formattedValue = formatDate(value, { dateStyle: 'full', timeStyle: 'short' });
  }

  if (type === 'time') {
    const [hour, minute] = value.split(':');
    const date = new Date();
    date.setHours(Number(hour));
    date.setMinutes(Number(minute));

    formattedValue = formatTime(date, {
      hour: 'numeric',
      minute: 'numeric',
    });
  }

  if (['float', 'integer', 'biginteger', 'decimal'].includes(type)) {
    formattedValue = formatNumber(Number(value));
  }

  // Handle custom input
  if (attribute.metadatas.customInput) {
    // If the custom input has an options array, find the option with a customValue matching the query value
    if (attribute.metadatas.options) {
      const selectedOption = attribute.metadatas.options.find((option) => {
        return option.customValue === value;
      });
      // Expecting option as an object: {label: 'Neat label', customValue: 'some.value'}
      // return the label or fallback to the query value
      formattedValue = selectedOption?.label || value;
    }
  }

  const content = `${attribute.metadatas.label || attribute.name} ${formatMessage({
    id: `components.FilterOptions.FILTER_TYPES.${operator}`,
    defaultMessage: operator,
  })} ${operator !== '$null' && operator !== '$notNull' ? formattedValue : ''}`;

  return (
    <Box padding={1}>
      <Tag onClick={handleClick} icon={<Cross />}>
        {content}
      </Tag>
    </Box>
  );
};
