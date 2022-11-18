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
import { NextLink, Pagination, PreviousLink, Dots, PageLink } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useLocation, NavLink } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { stringify } from 'qs';
import useQueryParams from '../../hooks/useQueryParams';

const PaginationURLQuery = ({ pagination: { pageCount } }) => {
  const [{ query }] = useQueryParams();
  const activePage = parseInt(query?.page || '1', 10);
  const { pathname } = useLocation();
  const { formatMessage } = useIntl();
  const makeSearch = (page) => stringify({ ...query, page }, { encode: false });
  const nextSearch = makeSearch(activePage + (pageCount > 1 ? 1 : 0));

  const previousSearch = makeSearch(activePage - 1);

  const firstLinks = [
    <PageLink as={NavLink} key={1} number={1} to={`${pathname}?${makeSearch(1)}`}>
      {formatMessage(
        { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
        { page: 1 }
      )}
    </PageLink>,
  ];

  if (pageCount <= 4) {
    const links = Array.from({ length: pageCount })
      .map((_, i) => i + 1)
      .map((number) => {
        return (
          <PageLink
            as={NavLink}
            key={number}
            number={number}
            to={`${pathname}?${makeSearch(number)}`}
          >
            {formatMessage(
              { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
              { page: number }
            )}
          </PageLink>
        );
      });

    return (
      <Pagination activePage={activePage} pageCount={pageCount}>
        <PreviousLink as={NavLink} to={`${pathname}?${previousSearch}`}>
          {formatMessage({
            id: 'components.pagination.go-to-previous',
            defaultMessage: 'Go to previous page',
          })}
        </PreviousLink>
        {links}
        <NextLink as={NavLink} to={`${pathname}?${nextSearch}`}>
          {formatMessage({
            id: 'components.pagination.go-to-next',
            defaultMessage: 'Go to next page',
          })}
        </NextLink>
      </Pagination>
    );
  }

  let firstLinksToCreate = [];
  let lastLinks = [];
  let lastLinksToCreate = [];
  const middleLinks = [];

  if (pageCount > 1) {
    lastLinks.push(
      <PageLink
        as={NavLink}
        key={pageCount}
        number={pageCount}
        to={`${pathname}?${makeSearch(pageCount)}`}
      >
        {formatMessage(
          { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
          { page: pageCount }
        )}
      </PageLink>
    );
  }

  if (activePage === 1 && pageCount >= 3) {
    firstLinksToCreate = [2];
  }

  if (activePage === 2 && pageCount >= 3) {
    if (pageCount === 5) {
      firstLinksToCreate = [2, 3, 4];
    } else if (pageCount === 3) {
      firstLinksToCreate = [2];
    } else {
      firstLinksToCreate = [2, 3];
    }
  }

  if (activePage === 4 && pageCount >= 3) {
    firstLinksToCreate = [2];
  }

  if (activePage === pageCount && pageCount >= 3) {
    lastLinksToCreate = [pageCount - 1];
  }

  if (activePage === pageCount - 2 && pageCount > 3) {
    lastLinksToCreate = [activePage + 1, activePage, activePage - 1];
  }

  if (activePage === pageCount - 3 && pageCount > 3 && activePage > 5) {
    lastLinksToCreate = [activePage + 2, activePage + 1, activePage, activePage - 1];
  }

  if (activePage === pageCount - 1 && pageCount > 3) {
    lastLinksToCreate = [activePage, activePage - 1];
  }

  lastLinksToCreate.forEach((number) => {
    lastLinks.unshift(
      <PageLink as={NavLink} key={number} number={number} to={`${pathname}?${makeSearch(number)}`}>
        Go to page {number}
      </PageLink>
    );
  });

  firstLinksToCreate.forEach((number) => {
    firstLinks.push(
      <PageLink as={NavLink} key={number} number={number} to={`${pathname}?${makeSearch(number)}`}>
        {formatMessage(
          { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
          { page: number }
        )}
      </PageLink>
    );
  });

  if (
    ![1, 2].includes(activePage) &&
    activePage <= pageCount - 3 &&
    firstLinks.length + lastLinks.length < 6
  ) {
    const middleLinksToCreate = [activePage - 1, activePage, activePage + 1];

    middleLinksToCreate.forEach((number) => {
      middleLinks.push(
        <PageLink
          as={NavLink}
          key={number}
          number={number}
          to={`${pathname}?${makeSearch(number)}`}
        >
          {formatMessage(
            { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
            { page: number }
          )}
        </PageLink>
      );
    });
  }

  const shouldShowDotsAfterFirstLink =
    pageCount > 5 || (pageCount === 5 && (activePage === 1 || activePage === 5));
  const shouldShowMiddleDots = middleLinks.length > 2 && activePage > 4 && pageCount > 5;

  const beforeDotsLinksLength = shouldShowMiddleDots
    ? pageCount - activePage - 1
    : pageCount - firstLinks.length - lastLinks.length;
  const afterDotsLength = shouldShowMiddleDots
    ? pageCount - firstLinks.length - lastLinks.length
    : pageCount - activePage - 1;

  return (
    <Pagination activePage={activePage} pageCount={pageCount}>
      <PreviousLink as={NavLink} to={`${pathname}?${previousSearch}`}>
        {formatMessage({
          id: 'components.pagination.go-to-previous',
          defaultMessage: 'Go to previous page',
        })}
      </PreviousLink>
      {firstLinks}
      {shouldShowMiddleDots && (
        <Dots>
          {formatMessage(
            {
              id: 'components.pagination.remaining-links',
              defaultMessage: 'And {number} other links',
            },
            { number: beforeDotsLinksLength }
          )}
        </Dots>
      )}
      {middleLinks}
      {shouldShowDotsAfterFirstLink && (
        <Dots>
          {formatMessage(
            {
              id: 'components.pagination.remaining-links',
              defaultMessage: 'And {number} other links',
            },
            { number: afterDotsLength }
          )}
        </Dots>
      )}
      {lastLinks}
      <NextLink as={NavLink} to={`${pathname}?${nextSearch}`}>
        {formatMessage({
          id: 'components.pagination.go-to-next',
          defaultMessage: 'Go to next page',
        })}
      </NextLink>
    </Pagination>
  );
};

PaginationURLQuery.propTypes = {
  pagination: PropTypes.shape({ pageCount: PropTypes.number.isRequired }).isRequired,
};

export default PaginationURLQuery;
