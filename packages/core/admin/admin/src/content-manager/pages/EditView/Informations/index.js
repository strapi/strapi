import React, { useRef } from 'react';
import { useIntl } from 'react-intl';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import { TableLabel, Text } from '@strapi/design-system/Text';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { getTrad } from '../../../utils';
import getUnits from './utils/getUnits';
import { getFullName } from '../../../../utils';

const Informations = () => {
  const { formatMessage, formatRelativeTime } = useIntl();
  const { initialData, isCreatingEntry } = useCMEditViewDataManager();

  const updatedAt = 'updatedAt';
  const updatedByFirstname = initialData.updatedBy?.firstname || '';
  const updatedByLastname = initialData.updatedBy?.lastname || '';
  const updatedByUsername = initialData.updatedBy?.username;
  const updatedBy = updatedByUsername || getFullName(updatedByFirstname, updatedByLastname);
  const currentTime = useRef(Date.now());
  const timestamp = initialData[updatedAt]
    ? new Date(initialData[updatedAt]).getTime()
    : Date.now();
  const elapsed = timestamp - currentTime.current;

  const { unit, value } = getUnits(-elapsed);

  return (
    <Box>
      <TableLabel textColor="neutral600">
        {formatMessage({
          id: getTrad('containers.Edit.information'),
          defaultMessage: 'Information',
        })}
      </TableLabel>
      <Box paddingTop={2} paddingBottom={6}>
        <Divider />
      </Box>
      <Stack size={4}>
        <Flex justifyContent="space-between">
          <Text bold>
            {formatMessage({
              id: getTrad('containers.Edit.information.lastUpdate'),
              defaultMessage: 'Last update',
            })}
          </Text>
          <Text>{formatRelativeTime(value, unit, { numeric: 'auto' })}</Text>
        </Flex>
        <Flex justifyContent="space-between">
          <Text bold>
            {formatMessage({
              id: getTrad('containers.Edit.information.by'),
              defaultMessage: 'By',
            })}
          </Text>
          <Text>{isCreatingEntry ? '-' : updatedBy}</Text>
        </Flex>
      </Stack>
    </Box>
  );
};

export default Informations;
