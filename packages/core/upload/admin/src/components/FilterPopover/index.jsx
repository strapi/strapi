/**
 *
 * FilterPopover
 *
 */

import React, { useState } from 'react';

import {
  Box,
  Button,
  Flex,
  SingleSelectOption,
  Popover,
  SingleSelect,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import FilterValueInput from './FilterValueInput';
import getFilterList from './utils/getFilterList';

const FilterPopover = ({ displayedFilters, filters, onSubmit, onToggle }) => {
  const { formatMessage } = useIntl();

  const [modifiedData, setModifiedData] = useState({
    name: 'createdAt',
    filter: '$eq',
    value: '',
  });

  const handleChangeFilterField = (value) => {
    const nextField = displayedFilters.find((f) => f.name === value);
    const {
      fieldSchema: { type, options },
    } = nextField;
    let filterValue = '';

    if (type === 'enumeration') {
      filterValue = options[0].value;
    }

    const filter = getFilterList(nextField)[0].value;

    setModifiedData({ name: value, filter, value: filterValue });
  };

  const handleChangeOperator = (operator) => {
    if (modifiedData.name === 'mime') {
      setModifiedData((prev) => ({ ...prev, filter: operator, value: 'image' }));
    } else {
      setModifiedData((prev) => ({ ...prev, filter: operator, value: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const encodedValue = encodeURIComponent(modifiedData.value);

    if (encodedValue) {
      if (modifiedData.name === 'mime') {
        const alreadyAppliedFilters = filters.filter((filter) => {
          return Object.keys(filter)[0] === 'mime';
        });

        if (modifiedData.value === 'file') {
          const filtersWithoutMimeType = filters.filter((filter) => {
            return Object.keys(filter)[0] !== 'mime';
          });

          let hasCurrentFilter = false;

          let filterToAdd;

          if (modifiedData.filter === '$contains') {
            hasCurrentFilter =
              alreadyAppliedFilters.find((filter) => {
                return filter.mime?.$not?.$contains !== undefined;
              }) !== undefined;

            filterToAdd = {
              mime: {
                $not: {
                  $contains: ['image', 'video'],
                },
              },
            };
          } else {
            hasCurrentFilter =
              alreadyAppliedFilters.find((filter) => {
                return Array.isArray(filter.mime?.$contains);
              }) !== undefined;

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

        const hasFilter =
          alreadyAppliedFilters.find((filter) => {
            return filter.mime[modifiedData.filter] === modifiedData.value;
          }) !== undefined;

        // Don't apply the same filter twice
        if (hasFilter) {
          onToggle();

          return;
        }

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
          return filter.mime?.[oppositeFilter] === modifiedData.value;
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

      const hasFilter =
        filters.find((filter) => {
          return (
            filter[modifiedData.name] &&
            filter[modifiedData.name]?.[modifiedData.filter] === encodedValue
          );
        }) !== undefined;

      if (!hasFilter) {
        let filterToAdd = { [modifiedData.name]: { [modifiedData.filter]: encodedValue } };

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
                    {filter.metadatas.label}
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
              {getFilterList(appliedFilter).map((option) => {
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
              {...appliedFilter.metadatas}
              {...appliedFilter.fieldSchema}
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

FilterPopover.propTypes = {
  displayedFilters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      metadatas: PropTypes.shape({ label: PropTypes.string }),
      fieldSchema: PropTypes.shape({ type: PropTypes.string }),
    })
  ).isRequired,
  filters: PropTypes.array.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default FilterPopover;
