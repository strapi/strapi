import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { ModalLayout, ModalHeader, ModalBody } from '@strapi/design-system/ModalLayout';
import { Breadcrumbs, Crumb } from '@strapi/design-system/Breadcrumbs';
import { Loader } from '@strapi/design-system/Loader';
import { Grid } from '@strapi/design-system/Grid';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { pxToRem, useNotification } from '@strapi/helper-plugin';
import getDefaultMessage from '../utils/getActionTypesDefaultMessages';
import useFormatTimeStamp from '../hooks/useFormatTimeStamp';
import ActionItem from './ActionItem';
import { useFetchClient } from '../../../../../../hooks';

const ModalDialog = ({ onClose, logId }) => {
  const { get } = useFetchClient();
  const toggleNotification = useNotification();

  const fetchAuditLog = async (id) => {
    const { data } = await get(`/admin/audit-logs/${id}`);

    return data;
  };

  const { data: { date, user, action, payload } = {}, status } = useQuery(
    ['audit-log', logId],
    () => fetchAuditLog(logId),
    {
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
        onClose();
      },
    }
  );

  const { formatMessage } = useIntl();
  const formatTimeStamp = useFormatTimeStamp();

  const formattedDate = status === 'success' ? formatTimeStamp(date) : '';

  const getModalBody = () => {
    if (status === 'loading') {
      return (
        <Flex padding={7} justifyContent="center" alignItems="center">
          <Loader />
        </Flex>
      );
    }

    return (
      <>
        <Box marginBottom={pxToRem(12)}>
          <Typography variant="delta" id="title">
            {formatMessage({
              id: 'Settings.permissions.auditLogs.details',
              defaultMessage: 'Log Details',
            })}
          </Typography>
        </Box>
        <Grid
          gap={4}
          gridCols={2}
          paddingTop={4}
          paddingBottom={4}
          paddingLeft={6}
          paddingRight={6}
          background="neutral100"
          hasRadius
        >
          <ActionItem
            actionLabel={formatMessage({
              id: 'Settings.permissions.auditLogs.action',
              defaultMessage: 'Action',
            })}
            actionName={formatMessage({
              id: `Settings.permissions.auditLogs.${action}`,
              defaultMessage: getDefaultMessage(action),
            })}
          />
          <ActionItem
            actionLabel={formatMessage({
              id: 'Settings.permissions.auditLogs.date',
              defaultMessage: 'Date',
            })}
            actionName={formattedDate}
          />
          <ActionItem
            actionLabel={formatMessage({
              id: 'Settings.permissions.auditLogs.user',
              defaultMessage: 'User',
            })}
            actionName={user ? user.fullname : '-'}
          />
        </Grid>
        {/* TODO remove when adding JSON component */}
        <Box as="pre" marginTop={4}>
          <Typography>{JSON.stringify(payload, null, 2)}</Typography>
        </Box>
      </>
    );
  };

  return (
    <ModalLayout onClose={onClose} labelledBy="title">
      <ModalHeader>
        <Breadcrumbs label={formattedDate}>
          <Crumb>{formattedDate}</Crumb>
        </Breadcrumbs>
      </ModalHeader>
      <ModalBody>{getModalBody()}</ModalBody>
    </ModalLayout>
  );
};

ModalDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  logId: PropTypes.number.isRequired,
};

export default ModalDialog;
