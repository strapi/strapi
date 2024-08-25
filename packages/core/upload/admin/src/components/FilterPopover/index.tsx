import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  SingleSelectOption,
  Popover,
  SingleSelect,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import FilterValueInput from './FilterValueInput';
import getFilterList from './utils/getFilterList';

type DisplayedFilter = {
  fieldSchema: {
    type: string; // "date" | "enumeration"
    mainField?: {
      schema: {
        type: string;
      };
    };
    options?: {
      label: string; // "audio" | "video" | "image" | "file"
      value: string; // "audio" | "video" | "image" | "file"
    }[];
  };
  metadatas?: {
    label: string; // "createdAt" | "updatedAt" | "type"
  };
  name: string; // "createdAt" | "updatedAt" | "mime"
};

type NumberKeyedObject = {
  [key: number]: string;
};

type MimeFilter = {
  $contains?: string | NumberKeyedObject;
  $notContains?: string | NumberKeyedObject;
  $not?: {
    $contains?: string | NumberKeyedObject;
  };
};

type FilterKey = 'createdAt' | 'updatedAt' | 'mime';
type Operator = '$eq' | '$ne' | '$gt' | '$gte';

type FilterType = {
  [key in FilterKey]?: key extends 'mime'
    ? MimeFilter
    : {
        [key in Operator]?: string;
      };
};

interface FilterPopoverProps {
  displayedFilters: DisplayedFilter[];
  filters: FilterType[];
  onSubmit: (filters: FilterType[]) => void;
  onToggle: () => void;
}

const FilterPopover = ({ displayedFilters, filters, onSubmit, onToggle }: FilterPopoverProps) => {
  const { formatMessage } = useIntl();

  // define type for this one
  const [modifiedData, setModifiedData] = React.useState({
    name: 'createdAt',
    filter: '$eq',
    value: '',
  });

  const handleChangeFilterField = (value: string | number) => {
    const nextField = displayedFilters.find((f) => f.name === value.toString());
    if (nextField && nextField?.fieldSchema?.type && nextField?.fieldSchema?.options) {
      const {
        fieldSchema: { type, options, mainField },
      } = nextField;
      let filterValue = '';

      if (type === 'enumeration') {
        filterValue = options[0].value;
      }

      let filter = '';

      if (mainField) {
        filter = getFilterList({
          fieldSchema: mainField.schema,
        })[0].value;
      }

      setModifiedData({ name: value.toString(), filter, value: filterValue });
    }
  };

  const handleChangeOperator = (operator: string | number) => {
    const stringOperator = operator.toString() as Operator;
    if (modifiedData.name === 'mime') {
      setModifiedData((prev) => ({ ...prev, filter: stringOperator, value: 'image' }));
    } else {
      setModifiedData((prev) => ({ ...prev, filter: stringOperator, value: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (modifiedData.value) {
      if (modifiedData.name === 'mime') {
        const alreadyAppliedFilters = filters.filter((filter) => {
          return Object.keys(filter)[0] === 'mime';
        });

        if (modifiedData.value === 'file') {
          const filtersWithoutMimeType = filters.filter((filter) => {
            return Object.keys(filter)[0] !== 'mime';
          });

          let hasCurrentFilter = false;

          let filterToAdd: FilterType = {};

          if (modifiedData.filter === '$contains') {
            hasCurrentFilter = alreadyAppliedFilters.some((filter) => {
              return filter.mime?.$not?.$contains !== undefined;
            });

            filterToAdd = {
              mime: {
                $not: {
                  $contains: ['image', 'video'],
                },
              },
            };
          } else {
            hasCurrentFilter = alreadyAppliedFilters.some((filter) => {
              return Array.isArray(filter.mime?.$contains);
            });

            filterToAdd = {
              mime: {
                $contains: ['image', 'video'],
              },
            };
          }

          if (hasCurrentFilter) {
            onToggle();

            return;
          }

          const nextFilters = [...filtersWithoutMimeType, filterToAdd];
          onSubmit(nextFilters);

          onToggle();

          return;
        }

        const hasFilter = alreadyAppliedFilters.some((filter) => {
          const mimeFilter = filter.mime as MimeFilter;
          return mimeFilter
            ? mimeFilter[modifiedData.filter as keyof MimeFilter] === modifiedData.value
            : false;
        });

        // Don't apply the same filter twice
        if (hasFilter) {
          onToggle();

          return;
        }

        // define the type for this one
        const filtersWithoutFile = filters.filter((filter) => {
          const filterType = Object.keys(filter)[0];

          if (filterType !== 'mime') {
            return true;
          }

          if (filter.mime?.$not?.$contains !== undefined) {
            return false;
          }

          if (Array.isArray(filter?.mime?.$contains)) {
            return false;
          }

          return true;
        });

        const oppositeFilter = modifiedData.filter === '$contains' ? '$notContains' : '$contains';

        const oppositeFilterIndex = filtersWithoutFile.findIndex((filter) => {
          const mimeFilter = filter.mime as MimeFilter;
          return mimeFilter?.[oppositeFilter as keyof MimeFilter] === modifiedData.value;
        });
        const hasOppositeFilter = oppositeFilterIndex !== -1;

        let filterToAdd = { [modifiedData.name]: { [modifiedData.filter]: modifiedData.value } };

        if (!hasOppositeFilter) {
          const nextFilters = [...filtersWithoutFile, filterToAdd];

          onSubmit(nextFilters);

          onToggle();

          return;
        }

        if (hasOppositeFilter) {
          const nextFilters = filtersWithoutFile.slice();
          nextFilters.splice(oppositeFilterIndex, 1, filterToAdd);
          onSubmit(nextFilters);

          onToggle();
        }

        return;
      }

      const hasFilter = filters.some((filter) => {
        const currentFilter = filter[modifiedData.name as FilterKey];

        if (modifiedData.name === 'mime') {
          const mimeFilter = currentFilter as MimeFilter;
          // Ensure `mimeFilter` is defined and contains the operator
          return (
            mimeFilter && mimeFilter[modifiedData.filter as keyof MimeFilter] === modifiedData.value
          );
        } else {
          const generalFilter = currentFilter as { [key in Operator]?: string | string[] };
          return (
            generalFilter && generalFilter[modifiedData.filter as Operator] === modifiedData.value
          );
        }
      });

      if (!hasFilter) {
        let filterToAdd = { [modifiedData.name]: { [modifiedData.filter]: modifiedData.value } };

        const nextFilters = [...filters, filterToAdd];

        onSubmit(nextFilters);
      }
    }

    onToggle();
  };

  const appliedFilter = displayedFilters.find((filter) => filter.name === modifiedData.name);

  return (
    <Popover.Content sideOffset={4}>
      <form onSubmit={handleSubmit}>
        <Flex padding={3} direction="column" alignItems="stretch" gap={1} style={{ minWidth: 184 }}>
          <Box>
            <SingleSelect
              aria-label={formatMessage({
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
                  <SingleSelectOption key={filter.name} value={filter.name}>
                    {filter.metadatas?.label}
                  </SingleSelectOption>
                );
              })}
            </SingleSelect>
          </Box>
          <Box>
            <SingleSelect
              aria-label={formatMessage({
                id: 'app.utils.select-filter',
                defaultMessage: 'Select filter',
              })}
              name="filter"
              size="M"
              value={modifiedData.filter}
              onChange={handleChangeOperator}
            >
              {appliedFilter?.fieldSchema &&
                getFilterList(appliedFilter).map((option) => {
                  return (
                    <SingleSelectOption key={option.value} value={option.value}>
                      {formatMessage(option.intlLabel)}
                    </SingleSelectOption>
                  );
                })}
            </SingleSelect>
          </Box>
          <Box>
            <FilterValueInput
              {...appliedFilter?.metadatas}
              {...appliedFilter?.fieldSchema}
              value={modifiedData.value}
              onChange={(value) => setModifiedData((prev) => ({ ...prev, value }))}
            />
          </Box>
          <Box>
            <Button size="L" variant="secondary" startIcon={<Plus />} type="submit" fullWidth>
              {formatMessage({ id: 'app.utils.add-filter', defaultMessage: 'Add filter' })}
            </Button>
          </Box>
        </Flex>
      </form>
    </Popover.Content>
  );
};

export default FilterPopover;
