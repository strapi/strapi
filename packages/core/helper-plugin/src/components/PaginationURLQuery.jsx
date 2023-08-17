/**
 * Pagination
 *
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

import React from 'react';

import { Dots, NextLink, PageLink, Pagination, PreviousLink } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { NavLink, useLocation } from 'react-router-dom';

import { useQueryParams } from '../hooks/useQueryParams';

export const PaginationURLQuery = ({ pagination: { pageCount }, boundaryCount, siblingCount }) => {
  const [{ query }] = useQueryParams();
  const activePage = parseInt(query?.page || '1', 10);
  const { pathname } = useLocation();
  const { formatMessage } = useIntl();
  const makeSearch = (page) => stringify({ ...query, page }, { encode: false });

  const nextSearch = makeSearch(activePage + (pageCount > 1 ? 1 : 0));

  const previousSearch = makeSearch(activePage - 1);

  const range = (start, end) => {
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

  return (
    <Pagination activePage={activePage} pageCount={pageCount}>
      <PreviousLink as={NavLink} to={{ pathname, search: previousSearch }}>
        {formatMessage({
          id: 'components.pagination.go-to-previous',
          defaultMessage: 'Go to previous page',
        })}
      </PreviousLink>
      {items.map((item) => {
        if (typeof item === 'number') {
          return (
            <PageLink
              as={NavLink}
              key={item}
              number={item}
              to={{ pathname, search: makeSearch(item) }}
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
      <NextLink as={NavLink} to={{ pathname, search: nextSearch }}>
        {formatMessage({
          id: 'components.pagination.go-to-next',
          defaultMessage: 'Go to next page',
        })}
      </NextLink>
    </Pagination>
  );
};

PaginationURLQuery.defaultProps = {
  boundaryCount: 1,
  siblingCount: 1,
};

PaginationURLQuery.propTypes = {
  /**
   * Number of always visible pages at the beginning and end.
   * @default 1
   */
  boundaryCount: PropTypes.number,
  pagination: PropTypes.shape({ pageCount: PropTypes.number.isRequired }).isRequired,
  /**
   * Number of always visible pages before and after the current page.
   * @default 1
   */
  siblingCount: PropTypes.number,
};
