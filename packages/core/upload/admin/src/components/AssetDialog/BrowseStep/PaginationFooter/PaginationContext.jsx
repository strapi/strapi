import { createContext, useContext } from 'react';

export const PaginationContext = createContext({ activePage: 1, pageCount: 1 });
export const usePagination = () => useContext(PaginationContext);
