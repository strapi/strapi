/**
 *
 * PageSizeURLQuery
 *
 */

import React from 'react';

import { Flex, Option, SingleSelect, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useTracking } from '../features/Tracking';
import { useQueryParams } from '../hooks/useQueryParams';

export const PageSizeURLQuery = ({ trackedEvent, options, defaultValue }) => {
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
  const pageSize = query?.pageSize || defaultValue;

  return (
    <Flex gap={2}>
      <SingleSelect
        size="S"
        aria-label={formatMessage({
          id: 'components.PageFooter.select',
          defaultMessage: 'Entries per page',
        })}
        onChange={handleChange}
        value={pageSize}
      >
        {options.map((option) => (
          <Option key={option} value={option}>
            {option}
          </Option>
        ))}
      </SingleSelect>
      <Typography textColor="neutral600" as="span">
        {formatMessage({
          id: 'components.PageFooter.select',
          defaultMessage: 'Entries per page',
        })}
      </Typography>
    </Flex>
  );
};

PageSizeURLQuery.defaultProps = {
  trackedEvent: null,
  options: ['10', '20', '50', '100'],
  defaultValue: '10',
};

PageSizeURLQuery.propTypes = {
  trackedEvent: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.string.isRequired),
  defaultValue: PropTypes.string,
};
