import React, { useRef } from 'react';

import { Box, Divider, Flex, Typography } from '@strapi/design-system';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad, getDisplayName } from '../../../utils';

import getUnits from './utils/getUnits';

const Title = () => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="sigma" textColor="neutral600" id="additional-information">
        {formatMessage({
          id: getTrad('containers.Edit.information'),
          defaultMessage: 'Information',
        })}
      </Typography>

      <Box>
        <Divider />
      </Box>
    </Flex>
  );
};

const KeyValuePair = ({ label, value }) => {
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

KeyValuePair.defaultProps = {
  value: '-',
};

KeyValuePair.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
};

const Body = () => {
  const { formatMessage, formatRelativeTime } = useIntl();
  const { initialData, isCreatingEntry } = useCMEditViewDataManager();
  const currentTime = useRef(Date.now());

  const getFieldInfo = (atField, byField) => {
    const displayName = initialData[byField]
      ? getDisplayName(initialData[byField], formatMessage)
      : '-';
    const timestamp = initialData[atField] ? new Date(initialData[atField]).getTime() : Date.now();
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
            id: getTrad('containers.Edit.information.created'),
            defaultMessage: 'Created',
          })}
          value={created.at}
        />

        <KeyValuePair
          label={formatMessage({
            id: getTrad('containers.Edit.information.by'),
            defaultMessage: 'By',
          })}
          value={created.by}
        />
      </Flex>

      <Flex direction="column" alignItems="stretch" gap={2} as="dl">
        <KeyValuePair
          label={formatMessage({
            id: getTrad('containers.Edit.information.lastUpdate'),
            defaultMessage: 'Last update',
          })}
          value={updated.at}
        />

        <KeyValuePair
          label={formatMessage({
            id: getTrad('containers.Edit.information.by'),
            defaultMessage: 'By',
          })}
          value={updated.by}
        />
      </Flex>
    </Flex>
  );
};

const Root = ({ children }) => {
  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {children}
    </Flex>
  );
};

Root.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
};

export const Information = {
  Root,
  Title,
  Body,
};
