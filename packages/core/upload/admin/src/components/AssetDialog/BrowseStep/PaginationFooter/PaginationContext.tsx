import * as React from 'react';

export const PaginationContext = React.createContext({ activePage: 1, pageCount: 1 });
export const usePagination = () => React.useContext(PaginationContext);
