import * as React from 'react';

import {
  Box,
  Flex,
  Grid,
  JSONInput,
  Loader,
  Modal as DSModal,
  Typography,
  Breadcrumbs,
  Crumb,
  Field,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useNotification } from '../../../../../../../../admin/src/features/Notifications';
import { useAPIErrorHandler } from '../../../../../../../../admin/src/hooks/useAPIErrorHandler';
import { AuditLog } from '../../../../../../../../shared/contracts/audit-logs';
import { useGetAuditLogQuery } from '../../../../../services/auditLogs';
import { useFormatTimeStamp } from '../hooks/useFormatTimeStamp';
import { actionTypes, getDefaultMessage } from '../utils/getActionTypesDefaultMessages';

interface ModalProps {
  handleClose: () => void;
  logId: string;
}

export const Modal = ({ handleClose, logId }: ModalProps) => {
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { data, error, isLoading } = useGetAuditLogQuery(logId);

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
      handleClose();
    }
  }, [error, formatAPIError, handleClose, toggleNotification]);

  const formatTimeStamp = useFormatTimeStamp();
  const formattedDate = data && 'date' in data ? formatTimeStamp(data.date) : '';

  return (
    <DSModal.Root defaultOpen onOpenChange={handleClose}>
      <DSModal.Content>
        <DSModal.Header>
          {/**
           * TODO: this is not semantically correct and should be amended.
           */}
          <Breadcrumbs label={formattedDate} id="title">
            <Crumb isCurrent>{formattedDate}</Crumb>
          </Breadcrumbs>
        </DSModal.Header>
        <DSModal.Body>
          <ActionBody isLoading={isLoading} data={data as AuditLog} formattedDate={formattedDate} />
        </DSModal.Body>
      </DSModal.Content>
    </DSModal.Root>
  );
};

interface ActionBodyProps {
  isLoading?: boolean;
  data: AuditLog;
  formattedDate: string;
}

const ActionBody = ({ isLoading, data, formattedDate }: ActionBodyProps) => {
  const { formatMessage } = useIntl();

  if (isLoading) {
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
      <Grid.Root
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
      </Grid.Root>
      <Field.Root>
        <Field.Label>
          {formatMessage({
            id: 'Settings.permissions.auditLogs.payload',
            defaultMessage: 'Payload',
          })}
        </Field.Label>
        <Payload value={JSON.stringify(payload, null, 2)} disabled />
      </Field.Root>
    </>
  );
};

const Payload = styled(JSONInput)`
  max-width: 100%;
  overflow: scroll;
`;

interface ActionItemProps {
  actionLabel: string;
  actionName: string;
}

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
