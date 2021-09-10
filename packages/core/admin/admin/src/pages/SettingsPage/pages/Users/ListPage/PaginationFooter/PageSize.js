import React from 'react';
import { Row, Select, Option } from '@strapi/parts';
import { useQueryParams } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

const PageSize = () => {
  const { formatMessage } = useIntl();
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
      <Select
        label={formatMessage({
          id: 'components.PageFooter.select',
          defaultMessage: 'Entries per page',
        })}
        onChange={handleChange}
        value={pageSize}
      >
        <Option value="10">10</Option>
        <Option value="20">20</Option>
        <Option value="50">50</Option>
        <Option value="100">100</Option>
      </Select>
      {/* <Box paddingLeft={2}>
        <Text textColor="neutral600" as="label" htmlFor="page-size">
          {formatMessage({
            id: 'components.PageFooter.select',
            defaultMessage: 'Entries per page',
          })}
        </Text>
      </Box> */}
    </Row>
  );
};

export default PageSize;
