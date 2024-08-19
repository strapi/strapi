import * as React from 'react';

import { Box, Divider, Flex, Typography } from '@strapi/design-system';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/translations';
import { getDisplayName } from '../../../utils/users';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

interface RootProps {
  children: React.ReactNode;
}

const Root = ({ children }: RootProps) => {
  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {children}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Title
 * -----------------------------------------------------------------------------------------------*/

const Title = () => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="sigma" textColor="neutral600" id="additional-information">
        {formatMessage({
          id: getTranslation('containers.Edit.information'),
          defaultMessage: 'Information',
        })}
      </Typography>

      <Box>
        <Divider />
      </Box>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Body
 * -----------------------------------------------------------------------------------------------*/

const Body = () => {
  const { formatMessage, formatRelativeTime } = useIntl();
  const { initialData, isCreatingEntry } = useCMEditViewDataManager();
  const currentTime = React.useRef(Date.now());

  const getFieldInfo = (atField: 'updatedAt' | 'createdAt', byField: 'updatedBy' | 'createdBy') => {
    const user = initialData[byField];
    const at = initialData[atField];

    const displayName = user ? getDisplayName(user, formatMessage) : '-';
    const timestamp = at ? new Date(at).getTime() : Date.now();
    const elapsed = timestamp - currentTime.current;
    const { unit, value } = getUnits(-elapsed);

    return {
      at: formatRelativeTime(value, unit, { numeric: 'auto' }),
      by: isCreatingEntry ? '-' : displayName,
    };
  };

  const updated = getFieldInfo('updatedAt', 'updatedBy');
  const created = getFieldInfo('createdAt', 'createdBy');

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex direction="column" alignItems="stretch" gap={2} as="dl">
        <KeyValuePair
          label={formatMessage({
            id: getTranslation('containers.Edit.information.created'),
            defaultMessage: 'Created',
          })}
          value={created.at}
        />

        <KeyValuePair
          label={formatMessage({
            id: getTranslation('containers.Edit.information.by'),
            defaultMessage: 'By',
          })}
          value={created.by}
        />
      </Flex>

      <Flex direction="column" alignItems="stretch" gap={2} as="dl">
        <KeyValuePair
          label={formatMessage({
            id: getTranslation('containers.Edit.information.lastUpdate'),
            defaultMessage: 'Last update',
          })}
          value={updated.at}
        />

        <KeyValuePair
          label={formatMessage({
            id: getTranslation('containers.Edit.information.by'),
            defaultMessage: 'By',
          })}
          value={updated.by}
        />
      </Flex>
    </Flex>
  );
};

interface KeyValuePairProps {
  label: string;
  value?: string;
}

const KeyValuePair = ({ label, value = '-' }: KeyValuePairProps) => {
  return (
    <Flex justifyContent="space-between">
      <Typography as="dt" fontWeight="bold" textColor="neutral800" variant="pi">
        {label}
      </Typography>
      <Typography as="dd" variant="pi" textColor="neutral600">
        {value}
      </Typography>
    </Flex>
  );
};

const MINUTE = 60 * 1000;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

/**
 * @internal
 *
 * @description This compares the milliseconds to the constants above to understand
 * which time unit it's closest too e.g. is it under a minute? then it's seconds
 * and we turn the value into seconds.
 */
const getUnits = (value: number): { unit: Intl.RelativeTimeFormatUnit; value: number } => {
  if (value < MINUTE) {
    return { unit: 'second', value: -Math.round(value / 1000) };
  }
  if (value < HOUR) {
    return { unit: 'minute', value: -Math.round(value / MINUTE) };
  }
  if (value < DAY) {
    return { unit: 'hour', value: -Math.round(value / HOUR) };
  }
  if (value < MONTH) {
    return { unit: 'day', value: -Math.round(value / DAY) };
  }
  if (value < YEAR) {
    return { unit: 'month', value: -Math.round(value / MONTH) };
  }

  return { unit: 'year', value: -Math.round(value / YEAR) };
};

export const Information = {
  Root,
  Title,
  Body,
};
