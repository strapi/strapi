/**
 *
 * PageSizeURLQuery
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Select, Option } from '@strapi/parts/Select';
import { Text } from '@strapi/parts/Text';
import PropTypes from 'prop-types';
import useQueryParams from '../../hooks/useQueryParams';
import useTracking from '../../hooks/useTracking';

const PageSizeURLQuery = ({ trackedEvent }) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams();
  const { trackUsage } = useTracking();

  const handleChange = e => {
    if (trackedEvent) {
      trackUsage(trackedEvent);
    }

    setQuery({
      pageSize: e,
      page: 1,
    });
  };
  const pageSize = query?.pageSize || '10';

  return (
    <Row>
      <Select
        aria-label={formatMessage({
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
      <Box paddingLeft={2}>
        <Text textColor="neutral600" as="label" htmlFor="page-size">
          {formatMessage({
            id: 'components.PageFooter.select',
            defaultMessage: 'Entries per page',
          })}
        </Text>
      </Box>
    </Row>
  );
};

PageSizeURLQuery.defaultProps = {
  trackedEvent: null,
};

PageSizeURLQuery.propTypes = {
  trackedEvent: PropTypes.string,
};

export default PageSizeURLQuery;
