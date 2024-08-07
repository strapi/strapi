/* eslint-disable import/export */
import * as React from 'react';

import {
  Flex,
  SingleSelectOption,
  SingleSelect,
  Typography,
  Dots,
  NextLink,
  PageLink,
  Pagination as PaginationImpl,
  PreviousLink,
} from '@strapi/design-system';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { useQueryParams } from '../hooks/useQueryParams';

import { createContext } from './Context';

import type { Pagination as PaginationApi } from '../../../shared/contracts/shared';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/
interface PaginationContextValue {
  /**
   * @description the complete query object, this could include query params
   * injected by other plugins, if you're navigating to a different page you
   * should ensure these are still passed.
   */
  currentQuery?: object;
  pageCount: string;
  pageSize: string;
  page: string;
  setPageSize: (pageSize: string) => void;
  total: NonNullable<RootProps['total']>;
}

const [PaginationProvider, usePagination] = createContext<PaginationContextValue>('Pagination');

interface RootProps {
  children: React.ReactNode;
  /**
   * @default 0
   * @description the total number of pages
   * that exist in the dataset.
   */
  pageCount?: PaginationApi['pageCount'];
  /**
   * @default 1
   * @description the initial page number.
   */
  defaultPage?: PaginationApi['page'];
  /**
   * @default 10
   * @description the initial number of items to display
   */
  defaultPageSize?: PaginationApi['pageSize'];
  /**
   * @description a callback that is called when the page size changes.
   */
  onPageSizeChange?: (pageSize: string) => void;
  /**
   * @default 0
   * @description the total number of items in the dataset.
   */
  total?: PaginationApi['total'];
}

/**
 * @description The root component for the composable pagination component.
 * It's advised to spread the entire pagination option object into this component.
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *  return (
 *    <Pagination.Root {...response.pagination}>
 *      <Pagination.PageSize />
 *      <Pagination.Links />
 *    </Pagination.Root>
 *  );
 * };
 * ```
 */
const Root = React.forwardRef<HTMLDivElement, RootProps>(
  (
    { children, defaultPageSize = 10, pageCount = 0, defaultPage = 1, onPageSizeChange, total = 0 },
    forwardedRef
  ) => {
    const [{ query }, setQuery] = useQueryParams<Pick<PaginationContextValue, 'page' | 'pageSize'>>(
      {
        pageSize: defaultPageSize.toString(),
        page: defaultPage.toString(),
      }
    );

    const setPageSize = (pageSize: string) => {
      setQuery({ pageSize, page: '1' });

      if (onPageSizeChange) {
        onPageSizeChange(pageSize);
      }
    };

    return (
      <Flex
        ref={forwardedRef}
        paddingTop={4}
        paddingBottom={4}
        alignItems="flex-end"
        justifyContent="space-between"
      >
        <PaginationProvider
          currentQuery={query}
          page={query.page}
          pageSize={query.pageSize}
          pageCount={pageCount.toString()}
          setPageSize={setPageSize}
          total={total}
        >
          {children}
        </PaginationProvider>
      </Flex>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * PageSize
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description The page size component is responsible for rendering the select input that allows
 * the user to change the number of items displayed per page.
 * If the total number of items is less than the minimum option, this component will not render.
 */
const PageSize = ({ options = ['10', '20', '50', '100'] }: Pagination.PageSizeProps) => {
  const { formatMessage } = useIntl();

  const pageSize = usePagination('PageSize', (state) => state.pageSize);
  const totalCount = usePagination('PageSize', (state) => state.total);
  const setPageSize = usePagination('PageSize', (state) => state.setPageSize);

  const handleChange = (value: string) => {
    setPageSize(value);
  };

  const minimumOption = parseInt(options[0], 10);

  if (minimumOption >= totalCount) {
    return null;
  }

  return (
    <Flex gap={2}>
      <SingleSelect
        size="S"
        aria-label={formatMessage({
          id: 'components.PageFooter.select',
          defaultMessage: 'Entries per page',
        })}
        // @ts-expect-error from the DS V2 this won't be needed because we're only returning strings.
        onChange={handleChange}
        value={pageSize}
      >
        {options.map((option) => (
          <SingleSelectOption key={option} value={option}>
            {option}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <Typography textColor="neutral600" tag="span">
        {formatMessage({
          id: 'components.PageFooter.select',
          defaultMessage: 'Entries per page',
        })}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Links
 * -----------------------------------------------------------------------------------------------*/

/**
 * The component works as follows
 * `1` , 2, 3, ... 10
 * 1, `2`, 3, ... 10
 * 1, 2, `3`, 4, ... 10
 * 1, 2, 3, `4`, 5, ... 10
 * 1, ..,4, `5`, 6, ... 10
 *
 * 1, ...., 8, 9, `10`
 * 1, ...., 8, `9`, 10
 * 1, ...., 7, `8`, 9, 10
 * 1, ... 6, `7`, 8, 9, 10
 */

/**
 * @description The links component is responsible for rendering the pagination links.
 * If the total number of pages is less than or equal to 1, this component will not render.
 */
const Links = ({ boundaryCount = 1, siblingCount = 1 }: Pagination.LinksProps) => {
  const { formatMessage } = useIntl();

  const query = usePagination('Links', (state) => state.currentQuery);
  const currentPage = usePagination('Links', (state) => state.page);
  const totalPages = usePagination('Links', (state) => state.pageCount);

  const pageCount = parseInt(totalPages, 10);
  const activePage = parseInt(currentPage, 10);

  const range = (start: number, end: number) => {
    const length = end - start + 1;

    return Array.from({ length }, (_, i) => start + i);
  };

  const startPages = range(1, Math.min(boundaryCount, pageCount));
  const endPages = range(Math.max(pageCount - boundaryCount + 1, boundaryCount + 1), pageCount);

  const siblingsStart = Math.max(
    Math.min(
      // Natural start
      activePage - siblingCount,
      // Lower boundary when page is high
      pageCount - boundaryCount - siblingCount * 2 - 1
    ),
    // Greater than startPages
    boundaryCount + 2
  );

  const siblingsEnd = Math.min(
    Math.max(
      // Natural end
      activePage + siblingCount,
      // Upper boundary when page is low
      boundaryCount + siblingCount * 2 + 2
    ),
    // Less than endPages
    endPages.length > 0 ? endPages[0] - 2 : pageCount - 1
  );

  const items = [
    ...startPages,

    // Start ellipsis
    // eslint-disable-next-line no-nested-ternary
    ...(siblingsStart > boundaryCount + 2
      ? ['start-ellipsis']
      : boundaryCount + 1 < pageCount - boundaryCount
        ? [boundaryCount + 1]
        : []),

    // Sibling pages
    ...range(siblingsStart, siblingsEnd),

    // End ellipsis
    // eslint-disable-next-line no-nested-ternary
    ...(siblingsEnd < pageCount - boundaryCount - 1
      ? ['end-ellipsis']
      : pageCount - boundaryCount > boundaryCount
        ? [pageCount - boundaryCount]
        : []),

    ...endPages,
  ];

  if (pageCount <= 1) {
    return null;
  }

  return (
    <PaginationImpl activePage={activePage} pageCount={pageCount}>
      <PreviousLink tag={Link} to={{ search: stringify({ ...query, page: activePage - 1 }) }}>
        {formatMessage({
          id: 'components.pagination.go-to-previous',
          defaultMessage: 'Go to previous page',
        })}
      </PreviousLink>
      {items.map((item) => {
        if (typeof item === 'number') {
          return (
            <PageLink
              tag={Link}
              key={item}
              number={item}
              to={{ search: stringify({ ...query, page: item }) }}
            >
              {formatMessage(
                { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
                { page: item }
              )}
            </PageLink>
          );
        }

        return <Dots key={item} />;
      })}

      <NextLink tag={Link} to={{ search: stringify({ ...query, page: activePage + 1 }) }}>
        {formatMessage({
          id: 'components.pagination.go-to-next',
          defaultMessage: 'Go to next page',
        })}
      </NextLink>
    </PaginationImpl>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EXPORTS
 * -----------------------------------------------------------------------------------------------*/

const Pagination = {
  Root,
  Links,
  PageSize,
};

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Pagination {
  export interface Props extends RootProps {}

  export interface PageSizeProps {
    options?: string[];
  }

  export interface LinksProps {
    /**
     * @default 1
     * @description Number of always visible pages at the beginning and end.
     */
    boundaryCount?: number;
    /**
     * @default 1
     * @description Number of always visible pages before and after the current page.
     */
    siblingCount?: number;
  }
}

export { Pagination };
