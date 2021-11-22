import React, { useRef } from 'react';
import { useIntl } from 'react-intl';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import { Typography } from '@strapi/design-system/Typography';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { getTrad } from '../../../utils';
import getUnits from './utils/getUnits';

const Informations = () => {
  const { formatMessage, formatRelativeTime } = useIntl();
  const { initialData, isCreatingEntry } = useCMEditViewDataManager();

  const updatedAt = 'updatedAt';
  const updatedByFirstname = initialData.updatedBy?.firstname || '';
  const updatedByLastname = initialData.updatedBy?.lastname || '';
  const updatedByUsername = initialData.updatedBy?.username;
  const updatedBy = updatedByUsername || `${updatedByFirstname} ${updatedByLastname}`;
  const currentTime = useRef(Date.now());
  const timestamp = initialData[updatedAt]
    ? new Date(initialData[updatedAt]).getTime()
    : Date.now();
  const elapsed = timestamp - currentTime.current;

  const { unit, value } = getUnits(-elapsed);

  return (
    <Box>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: getTrad('containers.Edit.information'),
          defaultMessage: 'Information',
        })}
      </Typography>
      <Box paddingTop={2} paddingBottom={6}>
        <Divider />
      </Box>
      <Stack size={4}>
        <Flex justifyContent="space-between">
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTrad('containers.Edit.information.lastUpdate'),
              defaultMessage: 'Last update',
            })}
          </Typography>
          <Typography>{formatRelativeTime(value, unit, { numeric: 'auto' })}</Typography>
        </Flex>
        <Flex justifyContent="space-between">
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTrad('containers.Edit.information.by'),
              defaultMessage: 'By',
            })}
          </Typography>
          <Typography>{isCreatingEntry ? '-' : updatedBy}</Typography>
        </Flex>
      </Stack>
    </Box>
  );
};

export default Informations;
