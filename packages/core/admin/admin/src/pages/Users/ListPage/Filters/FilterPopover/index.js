import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Button, Box, Popover, Stack, Select, Option, FocusTrap } from '@strapi/parts';
import { AddIcon } from '@strapi/icons';
import { useQueryParams } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import Inputs from './Inputs';
import getFilterList from './utils/getFilterList';

const FullWidthButton = styled(Button)`
  width: 100%;
`;

const FilterPopover = ({ displayedFilters, isVisible, onToggle, source }) => {
  const [{ query }, setQuery] = useQueryParams();
  const { formatMessage } = useIntl();
  const [modifiedData, setModifiedData] = useState({
    name: displayedFilters[0].name,
    filter: getFilterList(displayedFilters[0])[0].value,
    value: '',
  });

  if (!isVisible) {
    return null;
  }

  const handleChangeFilterField = value => {
    const nextField = displayedFilters.find(f => f.name === value);
    const {
      fieldSchema: { type },
    } = nextField;

    setModifiedData({ name: value, filter: '$eq', value: type === 'boolean' ? 'true' : '' });
  };

  const handleSubmit = e => {
    e.preventDefault();

    const hasFilter =
      query?.filters?.$and.find(filter => {
        return (
          filter[modifiedData.name] &&
          filter[modifiedData.name]?.[modifiedData.filter] === modifiedData.value
        );
      }) !== undefined;

    if (modifiedData.value && !hasFilter) {
      const filters = [
        ...(query?.filters?.$and || []),
        { [modifiedData.name]: { [modifiedData.filter]: modifiedData.value } },
      ];

      setQuery({ filters: { $and: filters }, page: 1 });
    }
    onToggle();
  };

  const appliedFilter = displayedFilters.find(filter => filter.name === modifiedData.name);

  return (
    <Popover source={source} padding={3} spacingTop={1}>
      <FocusTrap onEscape={onToggle}>
        <form onSubmit={handleSubmit}>
          <Stack size={1} style={{ minWidth: 184 }}>
            <Box>
              <Select
                aria-label="Select field"
                name="name"
                size="S"
                onChange={handleChangeFilterField}
                value={modifiedData.name}
              >
                {displayedFilters.map(filter => {
                  return (
                    <Option key={filter.name} value={filter.name}>
                      {filter.metadatas.label}
                    </Option>
                  );
                })}
              </Select>
            </Box>
            <Box>
              <Select
                aria-label="Select filter"
                name="filter"
                size="S"
                value={modifiedData.filter}
                onChange={val => setModifiedData(prev => ({ ...prev, filter: val }))}
              >
                {getFilterList(appliedFilter).map(option => {
                  return (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  );
                })}
              </Select>
            </Box>
            <Box>
              <Inputs
                {...appliedFilter.fieldSchema}
                value={modifiedData.value}
                onChange={value => setModifiedData(prev => ({ ...prev, value }))}
              />
            </Box>
            <Box>
              <FullWidthButton variant="secondary" startIcon={<AddIcon />} type="submit">
                {formatMessage({ id: 'app.utils.add-filter', defaultMessage: 'Add filter' })}
              </FullWidthButton>
            </Box>
          </Stack>
        </form>
      </FocusTrap>
    </Popover>
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
  isVisible: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  source: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
};

export default FilterPopover;
