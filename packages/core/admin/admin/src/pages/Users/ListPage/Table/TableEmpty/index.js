import React from 'react';
import { Row, Box } from '@strapi/parts';
import { EmptyStateDocument } from '@strapi/icons';

const TableEmpty = () => {
  return (
    <Box paddingTop={11} background="neutral0" hasRadius shadow="filterShadow">
      <Row justifyContent="space-around">
        <EmptyStateDocument height="100%" width="18rem" />
      </Row>
    </Box>
  );
};

export default TableEmpty;
