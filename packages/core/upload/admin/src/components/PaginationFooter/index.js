import React from 'react';
import PropTypes from 'prop-types';
import { Box, Row } from '@strapi/parts';
import { PaginationURLQuery, PageSizeURLQuery } from '@strapi/helper-plugin';

export const PaginationFooter = ({ pagination }) => {
  return (
    <Box paddingTop={6}>
      <Row alignItems="flex-end" justifyContent="space-between">
        <PageSizeURLQuery />
        <PaginationURLQuery pagination={pagination} />
      </Row>
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
