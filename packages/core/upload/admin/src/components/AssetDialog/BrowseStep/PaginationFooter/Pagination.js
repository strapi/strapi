import React, { useMemo } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Flex } from '@strapi/design-system/Flex';
import { PaginationContext } from './PaginationContext';

const PaginationWrapper = styled.nav``;
const PaginationList = styled(Flex)`
  & > * + * {
    margin-left: ${({ theme }) => theme.spaces[1]};
  }
`;

export const Pagination = ({ children, label, activePage, pageCount }) => {
  const paginationValue = useMemo(() => ({ activePage, pageCount }), [activePage, pageCount]);

  return (
    <PaginationContext.Provider value={paginationValue}>
      <PaginationWrapper aria-label={label}>
        <PaginationList as="ul">{children}</PaginationList>
      </PaginationWrapper>
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
