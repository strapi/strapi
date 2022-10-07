import React from 'react';
import { Select, Option } from '@strapi/design-system/Select';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import PropTypes from 'prop-types';
import { getTrad } from '../../../../content-manager/utils';

const SortFilter = ({ value, onChange }) => {
  const { formatMessage } = useIntl();

  return (
    <Select
      id="marketplaceSortButton"
      size="S"
      value={value}
      onChange={(sort) => onChange(sort)}
      customizeContent={() => (
        <Typography variant="pi" fontWeight="bold">
          {formatMessage({
            id: getTrad('admin.pages.MarketPlacePage.sort.sortBy'),
            defaultMessage: 'Sort by',
          })}
        </Typography>
      )}
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
  );
};

SortFilter.propTypes = {
  value: PropTypes.oneOf([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default SortFilter;
