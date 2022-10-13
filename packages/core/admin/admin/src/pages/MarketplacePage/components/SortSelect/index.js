import React from 'react';
import { Select, Option } from '@strapi/design-system/Select';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { getTrad } from '../../../../content-manager/utils';

const SelectTypography = () => {
  const { formatMessage } = useIntl();

  return (
    <Typography variant="pi" fontWeight="bold">
      {formatMessage({
        id: getTrad('admin.pages.MarketPlacePage.sort.sortBy'),
        defaultMessage: 'Sort by',
      })}
    </Typography>
  );
};

const SortSelect = ({ value, onChange }) => {
  const { formatMessage } = useIntl();

  return (
    <Box style={{ minWidth: '120px' }}>
      <Select
        id="marketplaceSortButton"
        size="S"
        value={value}
        onChange={(sort) => onChange(sort)}
        customizeContent={SelectTypography}
      >
        <Option value="name:asc">
          {formatMessage({
            id: getTrad('admin.pages.MarketPlacePage.sort.alphabetical'),
            defaultMessage: 'Alphabetical order',
          })}
        </Option>
        <Option value="submissionDate:desc">
          {formatMessage({
            id: getTrad('admin.pages.MarketPlacePage.sort.newest'),
            defaultMessage: 'Newest',
          })}
        </Option>
      </Select>
    </Box>
  );
};

SortSelect.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default SortSelect;
