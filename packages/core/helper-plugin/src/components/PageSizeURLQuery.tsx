/**
 *
 * PageSizeURLQuery
 *
 */

import * as React from 'react';

import { Flex, Option, SingleSelect, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useTracking, TrackingEvent } from '../features/Tracking';
import { useQueryParams } from '../hooks/useQueryParams';

export interface PageSizeURLQueryProps {
  trackedEvent?: Extract<TrackingEvent, { properties?: never }>['name'];
  options?: string[];
  defaultValue?: string;
}

export const PageSizeURLQuery = ({
  trackedEvent,
  options = ['10', '20', '50', '100'],
  defaultValue = '10',
}: PageSizeURLQueryProps) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams();
  const { trackUsage } = useTracking();

  const handleChange = (value: string) => {
    if (trackedEvent) {
      trackUsage(trackedEvent);
    }

    setQuery({
      pageSize: value,
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
