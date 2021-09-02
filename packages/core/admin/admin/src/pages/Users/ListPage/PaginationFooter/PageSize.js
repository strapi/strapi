import React from 'react';
import { Row, Select, Option, Text } from '@strapi/parts';
import { useQueryParams } from '@strapi/helper-plugin';
import styled from 'styled-components';

const StyledText = styled(Text)`
  margin-left: 5px;
`;

const PageSize = () => {
  const [
    {
      query: { pageSize },
    },
    setQuery,
  ] = useQueryParams();
  const handleChange = e => {
    setQuery({
      pageSize: e,
      page: 1,
    });
  };

  return (
    <Row>
      <Select aria-label="Entries per page" onChange={handleChange} value={pageSize}>
        <Option value="10">10</Option>
        <Option value="20">20</Option>
        <Option value="50">50</Option>
        <Option value="100">100</Option>
      </Select>
      <StyledText textColor="neutral500" as="label">
        Entries per page
      </StyledText>
    </Row>
  );
};

export default PageSize;
