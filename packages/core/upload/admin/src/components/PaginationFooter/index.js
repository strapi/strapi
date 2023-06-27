import React from 'react';

import { Box, Flex } from '@strapi/design-system';
import { PageSizeURLQuery, PaginationURLQuery } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';

export const PaginationFooter = ({ pagination }) => {
  return (
    <Box paddingTop={6}>
      <Flex alignItems="flex-end" justifyContent="space-between">
        <PageSizeURLQuery />
        <PaginationURLQuery pagination={pagination} />
      </Flex>
    </Box>
  );
};

PaginationFooter.defaultProps = {
  pagination: {
    pageCount: 0,
    pageSize: 10,
    total: 0,
  },
};

PaginationFooter.propTypes = {
  pagination: PropTypes.shape({
    page: PropTypes.number,
    pageCount: PropTypes.number,
    pageSize: PropTypes.number,
    total: PropTypes.number,
  }),
};
