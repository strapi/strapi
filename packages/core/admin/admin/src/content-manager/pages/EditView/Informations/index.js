import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Box } from '@strapi/parts/Box';
import { Divider } from '@strapi/parts/Divider';
import { TableLabel, Text } from '@strapi/parts/Text';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { getTrad } from '../../../utils';
import getUnits from './utils/getUnits';

const Informations = () => {
  const { formatMessage, formatRelativeTime } = useIntl();
  const [{ unit, value }, setUnits] = useState({ unit: '', value: 0 });
  const { initialData, isCreatingEntry } = useCMEditViewDataManager();

  const updatedAt = 'updatedAt';
  const updatedByFirstname = initialData.updatedBy?.firstname || '';
  const updatedByLastname = initialData.updatedBy?.lastname || '';
  const updatedByUsername = initialData.updatedBy?.username;
  const updatedBy = updatedByUsername || `${updatedByFirstname} ${updatedByLastname}`;
  const timestamp = initialData[updatedAt]
    ? new Date(initialData[updatedAt]).getTime()
    : Date.now();

  useEffect(() => {
    const elapsed = timestamp - Date.now();
    setUnits(getUnits(-elapsed));
  }, [timestamp]);

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
        <Row justifyContent="space-between">
          <Text bold>
            {formatMessage({
              id: getTrad('containers.Edit.information.lastUpdate'),
              defaultMessage: 'Last update',
            })}
          </Text>
          <Text>
            {isCreatingEntry ? '-' : formatRelativeTime(value, unit, { numeric: 'auto' })}
          </Text>
        </Row>
        <Row justifyContent="space-between">
          <Text bold>
            {formatMessage({
              id: getTrad('containers.Edit.information.by'),
              defaultMessage: 'By',
            })}
          </Text>
          <Text>{isCreatingEntry ? '-' : updatedBy}</Text>
        </Row>
      </Stack>
    </Box>
  );
};

export default Informations;
