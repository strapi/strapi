import * as React from 'react';

import { Box, Tag } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useQueryParams } from '../hooks/useQueryParams';

import type { FilterData, Filter } from '../types';
export interface FilterListURLQueryProps {
  filtersSchema: FilterData[];
}

export const FilterListURLQuery = ({ filtersSchema = [] }: FilterListURLQueryProps) => {
  const [{ query }, setQuery] = useQueryParams<{
    filters: {
      $and: Filter[];
    };
    page?: number;
  }>();

  const handleClick = (filter: Filter) => {
    const nextFilters = (query?.filters?.$and || []).filter((prevFilter) => {
      const name = Object.keys(filter)[0] as keyof Filter;
      const filterType = Object.keys(filter[name])[0] as keyof Filter[typeof name];
      const value = filter[name][filterType];

      return prevFilter[name]?.[filterType] !== value;
    });

    setQuery({ filters: { $and: nextFilters }, page: 1 });
  };

  if (!query?.filters?.$and?.length) {
    return null;
  }

  return (
    <>
      {query?.filters?.$and?.map((filter, i) => {
        const attributeName = Object.keys(filter)[0] as keyof Filter;
        const attribute = filtersSchema.find(({ name }) => name === attributeName);

        if (!attribute) {
          return null;
        }

        if (attribute.fieldSchema.type === 'relation') {
          const relationTargetAttribute = attribute?.fieldSchema?.mainField
            ?.name as keyof Filter[typeof attributeName];
          const filterObj = filter[attributeName][relationTargetAttribute];

          if (typeof filterObj === 'object' && filterObj !== null) {
            const operator = Object.keys(filterObj)[0] as keyof typeof filterObj;
            const value = filterObj[operator] ?? '';

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

          return null;
        } else {
          const filterObj = filter[attributeName];
          const operator = Object.keys(filterObj)[0] as keyof typeof filterObj;
          const value = filterObj[operator];

          if (typeof value === 'string' || value === null) {
            return (
              <AttributeTag
                // eslint-disable-next-line react/no-array-index-key
                key={`${attributeName}-${i}`}
                attribute={attribute}
                filter={filter}
                onClick={handleClick}
                operator={operator}
                value={value ?? ''}
              />
            );
          }

          return null;
        }
      })}
    </>
  );
};

interface AttributeTagProps {
  attribute: FilterData;
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

  const type = fieldSchema.type === 'relation' ? fieldSchema?.mainField?.type : fieldSchema.type;

  let formattedValue = value;

  switch (type) {
    case 'date':
      formattedValue = formatDate(value, { dateStyle: 'full' });
      break;
    case 'datetime':
      formattedValue = formatDate(value, { dateStyle: 'full', timeStyle: 'short' });
      break;
    case 'time':
      const [hour, minute] = value.split(':');
      const date = new Date();
      date.setHours(Number(hour));
      date.setMinutes(Number(minute));

      formattedValue = formatTime(date, {
        hour: 'numeric',
        minute: 'numeric',
      });
      break;
    case 'float':
    case 'integer':
    case 'biginteger':
    case 'decimal':
      formattedValue = formatNumber(Number(value));
      break;
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
