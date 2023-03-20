/**
 *
 * PageSize
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { Box, Flex, Select, Option, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';

const PageSize = ({ onChangePageSize, pageSize }) => {
  const { formatMessage } = useIntl();

  const handleChange = (value) => {
    onChangePageSize(value);
  };

  return (
    <Flex>
      <Select
        size="S"
        aria-label={formatMessage({
          id: 'components.PageFooter.select',
          defaultMessage: 'Entries per page',
        })}
        onChange={handleChange}
        value={pageSize.toString()}
      >
        <Option value="10">10</Option>
        <Option value="20">20</Option>
        <Option value="50">50</Option>
        <Option value="100">100</Option>
      </Select>
      <Box paddingLeft={2}>
        <Typography textColor="neutral600" as="label" htmlFor="page-size">
          {formatMessage({
            id: 'components.PageFooter.select',
            defaultMessage: 'Entries per page',
          })}
        </Typography>
      </Box>
    </Flex>
  );
};

PageSize.propTypes = {
  onChangePageSize: PropTypes.func.isRequired,
  pageSize: PropTypes.number.isRequired,
};

export default PageSize;
