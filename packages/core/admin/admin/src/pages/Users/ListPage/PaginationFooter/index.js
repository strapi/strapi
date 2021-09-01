import React from 'react';
import { Box, Row, NextLink, Pagination, PreviousLink, Dots, PageLink } from '@strapi/parts';
import PageSize from './PageSize';

const PaginationFooter = () => {
  return (
    <Box paddingTop={6}>
      <Row justifyContent="space-between">
        <PageSize />
        <Pagination activePage={1} pageCount={26}>
          <PreviousLink to="/1">Go to previous page</PreviousLink>
          <PageLink number={1} to="/1">
            Go to page 1
          </PageLink>
          <PageLink number={2} to="/2">
            Go to page 2
          </PageLink>
          <Dots>And 23 other links</Dots>
          <PageLink number={25} to="/25">
            Go to page 3
          </PageLink>
          <PageLink number={26} to="/26">
            Go to page 26
          </PageLink>
          <NextLink to="/3">Go to next page</NextLink>
        </Pagination>
      </Row>
    </Box>
  );
};

export default PaginationFooter;
