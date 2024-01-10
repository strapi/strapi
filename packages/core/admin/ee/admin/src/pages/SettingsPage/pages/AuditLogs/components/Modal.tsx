import {
  Box,
  Flex,
  Grid,
  JSONInput,
  Loader,
  ModalBody,
  ModalHeader,
  ModalLayout,
  Typography,
} from '@strapi/design-system';
import { Breadcrumbs, Crumb } from '@strapi/design-system/v2';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { QueryStatus, useQuery } from 'react-query';

import { AuditLog, Get } from '../../../../../../../../shared/contracts/audit-logs';
import { useFormatTimeStamp } from '../hooks/useFormatTimeStamp';
import { actionTypes, getDefaultMessage } from '../utils/getActionTypesDefaultMessages';

type ActionBodyProps = {
  status: QueryStatus;
  data: AuditLog;
  formattedDate: string;
};

type ModalProps = {
  handleClose: () => void;
  logId: string;
};

type ActionItemProps = {
  actionLabel: string;
  actionName: string;
};

export const Modal = ({ handleClose, logId }: ModalProps) => {
  const { get } = useFetchClient();
  const toggleNotification = useNotification();

  const fetchAuditLog = async (id: string) => {
    const { data } = await get<Get.Response>(`/admin/audit-logs/${id}`);

    if (!data) {
      throw new Error('Audit log not found');
    }

    return data;
  };

  const { data, status } = useQuery(['audit-log', logId], () => fetchAuditLog(logId), {
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
      handleClose();
    },
  });

  const formatTimeStamp = useFormatTimeStamp();
  const formattedDate = data && 'date' in data ? formatTimeStamp(data.date) : '';

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      <ModalHeader>
        {/**
         * TODO: this is not semantically correct and should be amended.
         */}
        <Breadcrumbs label={formattedDate} id="title">
          <Crumb isCurrent>{formattedDate}</Crumb>
        </Breadcrumbs>
      </ModalHeader>
      <ModalBody>
        <ActionBody status={status} data={data as AuditLog} formattedDate={formattedDate} />
      </ModalBody>
    </ModalLayout>
  );
};

const ActionBody = ({ status, data, formattedDate }: ActionBodyProps) => {
  const { formatMessage } = useIntl();

  if (status === 'loading') {
    return (
      <Flex padding={7} justifyContent="center" alignItems="center">
        {/**
         * TODO: this will need to be translated.
         */}
        <Loader>Loading content...</Loader>
      </Flex>
    );
  }

  const { action, user, payload } = data;

  return (
    <>
      <Box marginBottom={3}>
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
        marginBottom={4}
        background="neutral100"
        hasRadius
      >
        <ActionItem
          actionLabel={formatMessage({
            id: 'Settings.permissions.auditLogs.action',
            defaultMessage: 'Action',
          })}
          actionName={formatMessage(
            {
              id: `Settings.permissions.auditLogs.${action}`,
              defaultMessage: getDefaultMessage(action as keyof typeof actionTypes),
            },
            // @ts-expect-error - any
            { model: payload?.model }
          )}
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
          actionName={user?.displayName || '-'}
        />
        <ActionItem
          actionLabel={formatMessage({
            id: 'Settings.permissions.auditLogs.userId',
            defaultMessage: 'User ID',
          })}
          actionName={user?.id.toString() || '-'}
        />
      </Grid>
      <JSONInput
        value={JSON.stringify(payload, null, 2)}
        disabled
        label={formatMessage({
          id: 'Settings.permissions.auditLogs.payload',
          defaultMessage: 'Payload',
        })}
      />
    </>
  );
};

const ActionItem = ({ actionLabel, actionName }: ActionItemProps) => {
  return (
    <Flex direction="column" alignItems="baseline" gap={1}>
      <Typography textColor="neutral600" variant="sigma">
        {actionLabel}
      </Typography>
      <Typography textColor="neutral600">{actionName}</Typography>
    </Flex>
  );
};
