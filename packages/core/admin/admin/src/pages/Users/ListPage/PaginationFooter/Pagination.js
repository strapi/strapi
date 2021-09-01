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
import {
  NextLink,
  Pagination as PaginationCompo,
  PreviousLink,
  Dots,
  PageLink,
} from '@strapi/parts';
import PropTypes from 'prop-types';
import { useQueryParams } from '@strapi/helper-plugin';
import { useLocation } from 'react-router-dom';
import { stringify } from 'qs';

const Pagination = ({ pagination: { pageCount } }) => {
  const [{ query }] = useQueryParams();
  const activePage = parseInt(query.page, 10);
  const { pathname } = useLocation();
  const makeSearch = page => stringify({ ...query, page }, { encode: false });
  const nextSearch = makeSearch(activePage + (pageCount > 1 ? 1 : 0));

  const previousSearch = makeSearch(activePage - 1);

  const firstLinks = [
    <PageLink key={1} number={1} to={`${pathname}?${makeSearch(1)}`}>
      Go to page 1
    </PageLink>,
  ];

  let firstLinksToCreate = [];
  let lastLinks = [];
  let lastLinksToCreate = [];
  const middleLinks = [];

  if (pageCount > 1) {
    lastLinks.push(
      <PageLink key={pageCount} number={pageCount} to={`${pathname}?${makeSearch(pageCount)}`}>
        Go to page {pageCount}
      </PageLink>
    );
  }

  if (activePage === 1 && pageCount >= 3) {
    firstLinksToCreate = [2];
  }

  if (activePage === 2 && pageCount >= 3) {
    firstLinksToCreate = pageCount === 5 ? [2, 3, 4] : [2, 3];
  }

  if (activePage === 4 && pageCount >= 3) {
    firstLinksToCreate = [2];
  }

  if (activePage === pageCount && pageCount >= 3) {
    lastLinksToCreate = [pageCount - 1];
  }

  if (activePage === pageCount - 2 && pageCount >= 3) {
    lastLinksToCreate = [activePage + 1, activePage, activePage - 1];
  }

  if (activePage === pageCount - 3 && pageCount >= 3 && activePage > 5) {
    lastLinksToCreate = [activePage + 2, activePage + 1, activePage, activePage - 1];
  }

  if (activePage === pageCount - 1 && pageCount >= 3) {
    lastLinksToCreate = [activePage, activePage - 1];
  }

  lastLinksToCreate.forEach(number => {
    lastLinks.unshift(
      <PageLink key={number} number={number} to={`${pathname}?${makeSearch(number)}`}>
        Go to page {number}
      </PageLink>
    );
  });

  firstLinksToCreate.forEach(number => {
    firstLinks.push(
      <PageLink key={number} number={number} to={`${pathname}?${makeSearch(number)}`}>
        Go to page {number}
      </PageLink>
    );
  });

  if (![1, 2].includes(activePage) && activePage < pageCount - 3) {
    const middleLinksToCreate = [activePage - 1, activePage, activePage + 1];

    middleLinksToCreate.forEach(number => {
      middleLinks.push(
        <PageLink key={number} number={number} to={`${pathname}?${makeSearch(number)}`}>
          Go to page {number}
        </PageLink>
      );
    });
  }

  const shouldShowDotsAfterFirstLink =
    pageCount > 5 || (pageCount === 5 && (activePage === 1 || activePage === 5));
  const shouldShowMiddleDots = middleLinks.length > 2 && activePage > 4 && pageCount > 5;

  const beforeDotsLinks = shouldShowMiddleDots
    ? pageCount - activePage - 1
    : pageCount - firstLinks.length - lastLinks.length;
  const afterDotsLength = shouldShowMiddleDots
    ? pageCount - firstLinks.length - lastLinks.length
    : pageCount - activePage - 1;

  return (
    <PaginationCompo activePage={activePage} pageCount={pageCount}>
      <PreviousLink to={`${pathname}?${previousSearch}`}>Go to previous page</PreviousLink>
      {firstLinks}
      {shouldShowMiddleDots && <Dots>And {beforeDotsLinks} links</Dots>}
      {middleLinks}
      {shouldShowDotsAfterFirstLink && <Dots>And {afterDotsLength} links</Dots>}
      {lastLinks}
      <NextLink to={`${pathname}?${nextSearch}`}>Go to next page</NextLink>
    </PaginationCompo>
  );
};

Pagination.propTypes = {
  pagination: PropTypes.shape({ pageCount: PropTypes.number.isRequired }).isRequired,
};

export default Pagination;
