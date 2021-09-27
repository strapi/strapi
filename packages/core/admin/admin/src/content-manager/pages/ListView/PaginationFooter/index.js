import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { PaginationURLQuery, PageSizeURLQuery } from '@strapi/helper-plugin';

const PaginationFooter = ({ pagination }) => {
  return (
    <Box paddingTop={6}>
      <Row alignItems="flex-end" justifyContent="space-between">
        <PageSizeURLQuery trackedEvent="willChangeNumberOfEntriesPerPage" />
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

export default PaginationFooter;
