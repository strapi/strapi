import React, { useRef } from 'react';
import { useIntl } from 'react-intl';
import { useContentManagerEditViewDataManager } from '@strapi/helper-plugin';
import { Box } from '@strapi/parts/Box';
import { Divider } from '@strapi/parts/Divider';
import { Text } from '@strapi/parts/Text';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { getTrad } from '../../../utils';
import getUnits from './utils/getUnits';

const Informations = () => {
  const { formatMessage, formatRelativeTime } = useIntl();
  const { initialData, isCreatingEntry } = useContentManagerEditViewDataManager();

  // TODO if timestamps are still configurable in the V4
  const updatedAt = 'updated_at';
  const updatedByFirstname = initialData.updated_by?.firstname || '';
  const updatedByLastname = initialData.updated_by?.lastname || '';
  const updatedByUsername = initialData.updated_by?.username;
  const updatedBy = updatedByUsername || `${updatedByFirstname} ${updatedByLastname}`;
  const currentTime = useRef(Date.now());
  const timestamp = initialData[updatedAt]
    ? new Date(initialData[updatedAt]).getTime()
    : Date.now();
  const elapsed = timestamp - currentTime.current;

  const { unit, value } = getUnits(-elapsed);

  return (
    <Box>
      <Text textColor="neutral600" bold small style={{ textTransform: 'uppercase' }}>
        {formatMessage({
          id: getTrad('containers.Edit.information'),
          defaultMessage: 'Information',
        })}
      </Text>
      <Box paddingTop={2} paddingBottom={6}>
        <Divider />
      </Box>
      <Stack size={4}>
        <Row justifyContent="space-between">
          <Text bold>
            {formatMessage({
              id: getTrad('containers.Edit.information.lastUpdate'),
            })}
          </Text>
          <Text>{formatRelativeTime(value, unit, { numeric: 'auto' })}</Text>
        </Row>
        <Row justifyContent="space-between">
          <Text bold>
            {formatMessage({
              id: getTrad('containers.Edit.information.by'),
            })}
          </Text>
          <Text>{isCreatingEntry ? '-' : updatedBy}</Text>
        </Row>
      </Stack>
    </Box>
  );
};

export default Informations;
