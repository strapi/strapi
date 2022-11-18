/**
 *
 * PageSizeURLQuery
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Select, Option } from '@strapi/design-system/Select';
import { Typography } from '@strapi/design-system/Typography';
import PropTypes from 'prop-types';
import useQueryParams from '../../hooks/useQueryParams';
import useTracking from '../../hooks/useTracking';

const PageSizeURLQuery = ({ trackedEvent }) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams();
  const { trackUsage } = useTracking();

  const handleChange = (e) => {
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
    <Flex>
      <Select
        size="S"
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
        <Typography textColor="neutral600" as="label" htmlFor="page-size">
          {formatMessage({
            id: 'components.PageFooter.select',
            defaultMessage: 'Entries per page',
          })}
        </Typography>
      </Box>
    </Flex>
  );
};

PageSizeURLQuery.defaultProps = {
  trackedEvent: null,
};

PageSizeURLQuery.propTypes = {
  trackedEvent: PropTypes.string,
};

export default PageSizeURLQuery;
