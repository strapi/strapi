import React from 'react';

import { Box, Flex } from '@strapi/design-system';
import { PageSizeURLQuery, PaginationURLQuery } from '@strapi/helper-plugin';

import { Pagination } from '../../../../../../../../shared/contracts/shared';

type PaginationFooterProps = {
  pagination: Pagination;
};

export const PaginationFooter = (
  { pagination }: PaginationFooterProps = {
    pagination: {
      page: 1,
      pageCount: 0,
      pageSize: 50,
      total: 0,
    },
  }
) => {
  return (
    <Box paddingTop={4}>
      <Flex alignItems="flex-end" justifyContent="space-between">
        <PageSizeURLQuery />
        <PaginationURLQuery pagination={pagination} />
      </Flex>
    </Box>
  );
};
