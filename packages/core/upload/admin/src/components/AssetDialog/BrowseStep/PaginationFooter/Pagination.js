import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Flex } from '@strapi/design-system';
import { PaginationContext } from './PaginationContext';

export const Pagination = ({ children, label, activePage, pageCount }) => {
  const paginationValue = useMemo(() => ({ activePage, pageCount }), [activePage, pageCount]);

  return (
    <PaginationContext.Provider value={paginationValue}>
      <Box as="nav" aria-label={label}>
        <Flex as="ul" gap={1}>
          {children}
        </Flex>
      </Box>
    </PaginationContext.Provider>
  );
};

Pagination.defaultProps = {
  label: 'pagination',
};

Pagination.propTypes = {
  activePage: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
  label: PropTypes.string,
  pageCount: PropTypes.number.isRequired,
};
