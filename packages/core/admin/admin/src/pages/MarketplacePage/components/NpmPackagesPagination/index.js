import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { PaginationURLQuery, PageSizeURLQuery } from '@strapi/helper-plugin';

const NpmPackagesPagination = ({ pagination }) => {
  return (
    <Box paddingTop={4}>
      <Flex alignItems="flex-end" justifyContent="space-between">
        <PageSizeURLQuery options={['12', '24', '50', '100']} defaultValue="24" />
        <PaginationURLQuery pagination={pagination} />
      </Flex>
    </Box>
  );
};

NpmPackagesPagination.propTypes = {
  pagination: PropTypes.shape({
    page: PropTypes.number.isRequired,
    pageCount: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
  }).isRequired,
};

export default NpmPackagesPagination;
