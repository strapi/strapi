import React from 'react';
import styled from 'styled-components';
import { Select, Option } from '@strapi/design-system/Select';
import { Box } from '@strapi/design-system/Box';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const SelectWrapper = styled(Box)`
  font-weight: ${({ theme }) => theme.fontWeights.semiBold};

  span {
    font-size: ${({ theme }) => theme.fontSizes[1]};
  }
`;

const SortSelect = ({ sortQuery, setQuery, setTabQuery, npmPackageType }) => {
  const { formatMessage } = useIntl();

  const sortTypes = {
    'name:asc': {
      selected: {
        id: 'admin.pages.MarketPlacePage.sort.alphabetical.selected',
        defaultMessage: 'Sort by alphabetical order',
      },
      option: {
        id: 'admin.pages.MarketPlacePage.sort.alphabetical',
        defaultMessage: 'Alphabetical order',
      },
    },
    'submissionDate:desc': {
      selected: {
        id: 'admin.pages.MarketPlacePage.sort.newest.selected',
        defaultMessage: 'Sort by newest',
      },
      option: {
        id: 'admin.pages.MarketPlacePage.sort.newest',
        defaultMessage: 'Newest',
      },
    },
  };

  return (
    <SelectWrapper>
      <Select
        size="S"
        id="sort-by-select"
        value={sortQuery}
        customizeContent={() => formatMessage(sortTypes[sortQuery].selected)}
        onChange={(sortName) => {
          setQuery({ sort: sortName });
          setTabQuery((prev) => ({
            ...prev,
            [npmPackageType]: { ...prev[npmPackageType], sort: sortName },
          }));
        }}
      >
        {Object.entries(sortTypes).map(([sortName, messages]) => {
          return (
            <Option key={sortName} value={sortName}>
              {formatMessage(messages.option)}
            </Option>
          );
        })}
      </Select>
    </SelectWrapper>
  );
};

SortSelect.propTypes = {
  sortQuery: PropTypes.string.isRequired,
  setQuery: PropTypes.func.isRequired,
  setTabQuery: PropTypes.func.isRequired,
  npmPackageType: PropTypes.string.isRequired,
};

export default SortSelect;
