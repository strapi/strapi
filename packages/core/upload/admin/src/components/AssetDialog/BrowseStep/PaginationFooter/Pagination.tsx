import * as React from 'react';

import { Box, Flex } from '@strapi/design-system';

const PaginationContext = React.createContext({ activePage: 1, pageCount: 1 });
export const usePagination = () => React.useContext(PaginationContext);

interface PaginationProps {
  activePage: number;
  children: React.ReactNode;
  label?: string;
  pageCount: number;
}

export const Pagination = ({
  children,
  activePage,
  pageCount,
  label = 'pagination',
}: PaginationProps) => {
  const paginationValue = React.useMemo(() => ({ activePage, pageCount }), [activePage, pageCount]);

  return (
    <PaginationContext.Provider value={paginationValue}>
      <Box tag="nav" aria-label={label}>
        <Flex tag="ul" gap={1}>
          {children}
        </Flex>
      </Box>
    </PaginationContext.Provider>
  );
};
