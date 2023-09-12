import React from 'react';

import { Box, Option, Select } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const SelectWrapper = styled(Box)`
  font-weight: ${({ theme }) => theme.fontWeights.semiBold};

  span {
    font-size: ${({ theme }) => theme.fontSizes[1]};
  }

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

const SortSelect = ({ sortQuery, handleSelectChange }) => {
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
    'githubStars:desc': {
      selected: {
        id: 'admin.pages.MarketPlacePage.sort.githubStars.selected',
        defaultMessage: 'Sort by GitHub stars',
      },
      option: {
        id: 'admin.pages.MarketPlacePage.sort.githubStars',
        defaultMessage: 'Number of GitHub stars',
      },
    },
    'npmDownloads:desc': {
      selected: {
        id: 'admin.pages.MarketPlacePage.sort.npmDownloads.selected',
        defaultMessage: 'Sort by npm downloads',
      },
      option: {
        id: 'admin.pages.MarketPlacePage.sort.npmDownloads',
        defaultMessage: 'Number of downloads',
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
          handleSelectChange({ sort: sortName });
        }}
        label={formatMessage({
          id: 'admin.pages.MarketPlacePage.sort.label',
          defaultMessage: 'Sort by',
        })}
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
  handleSelectChange: PropTypes.func.isRequired,
};

export default SortSelect;
