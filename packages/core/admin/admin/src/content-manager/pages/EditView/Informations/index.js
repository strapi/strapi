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
import { getFullName } from '../../../../utils';

const Informations = () => {
  const { formatMessage, formatRelativeTime } = useIntl();
  const { initialData, isCreatingEntry } = useCMEditViewDataManager();
  const currentTime = useRef(Date.now());

  const getFieldInfo = (atField, byField) => {
    const userFirstname = initialData[byField]?.firstname || '';
    const userLastname = initialData[byField]?.lastname || '';
    const userUsername = initialData[byField]?.username;
    const user = userUsername || getFullName(userFirstname, userLastname);
    const timestamp = initialData[atField] ? new Date(initialData[atField]).getTime() : Date.now();
    const elapsed = timestamp - currentTime.current;
    const { unit, value } = getUnits(-elapsed);

    return {
      at: formatRelativeTime(value, unit, { numeric: 'auto' }),
      by: isCreatingEntry ? '-' : user,
    };
  };

  const updated = getFieldInfo('updatedAt', 'updatedBy');
  const created = getFieldInfo('createdAt', 'createdBy');

  return (
    <Box>
      <Typography variant="sigma" textColor="neutral600" id="additional-informations">
        {formatMessage({
          id: getTrad('containers.Edit.information'),
          defaultMessage: 'Information',
        })}
      </Typography>
      <Box paddingTop={2} paddingBottom={6}>
        <Divider />
      </Box>
      <Stack spacing={4}>
        <Flex justifyContent="space-between">
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTrad('containers.Edit.information.created'),
              defaultMessage: 'Created',
            })}
          </Typography>
          <Typography>{created.at}</Typography>
        </Flex>
        <Flex justifyContent="space-between">
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTrad('containers.Edit.information.by'),
              defaultMessage: 'By',
            })}
          </Typography>
          <Typography>{created.by}</Typography>
        </Flex>
        <Flex justifyContent="space-between">
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTrad('containers.Edit.information.lastUpdate'),
              defaultMessage: 'Last update',
            })}
          </Typography>
          <Typography>{updated.at}</Typography>
        </Flex>
        <Flex justifyContent="space-between">
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTrad('containers.Edit.information.by'),
              defaultMessage: 'By',
            })}
          </Typography>
          <Typography>{updated.by}</Typography>
        </Flex>
      </Stack>
    </Box>
  );
};

export default Informations;
