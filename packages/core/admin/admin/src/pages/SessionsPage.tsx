import * as React from 'react';

import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { SignOut } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { Layouts } from '../components/Layouts/Layout';
import { Page } from '../components/PageHelpers';
import { RelativeTime } from '../components/RelativeTime';
import { useAuth } from '../features/Auth';
import { useNotification } from '../features/Notifications';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import {
  useGetActiveSessionsQuery,
  useRevokeAllSessionsMutation,
  useRevokeSessionMutation,
} from '../services/auth';
import { isBaseQueryError } from '../utils/baseQuery';

import type { SanitizedAdminSession } from '../../../shared/contracts/sessions';

/* -------------------------------------------------------------------------------------------------
 * SessionsPage
 * -----------------------------------------------------------------------------------------------*/

const SessionsPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const logout = useAuth('SessionsPage', (state) => state.logout);

  const { data: sessions = [], isLoading, error } = useGetActiveSessionsQuery();
  const [revokeSession] = useRevokeSessionMutation();
  const [revokeAllSessions] = useRevokeAllSessionsMutation();

  const handleLogoutAndRedirect = React.useCallback(async () => {
    // Auth.logout navigates to login after confirm + mutation (and may prompt first).
    await logout();
  }, [logout]);

  const notifyError = React.useCallback(
    (error?: unknown) => {
      toggleNotification({
        type: 'danger',
        message:
          error && isBaseQueryError(error)
            ? formatAPIError(error)
            : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    },
    [formatAPIError, formatMessage, toggleNotification]
  );

  const runSessionMutation = React.useCallback(
    async (
      action: () => Promise<{ error?: unknown } | { data: unknown } | void>,
      onSuccess: () => void | Promise<void>
    ) => {
      try {
        const res = await action();

        if (res && 'error' in res && res.error) {
          notifyError(res.error);
          return;
        }

        await onSuccess();
      } catch {
        notifyError();
      }
    },
    [notifyError]
  );

  const handleRevoke = async (session: SanitizedAdminSession) => {
    await runSessionMutation(
      () => revokeSession(session.id),
      async () => {
        if (session.current) {
          await handleLogoutAndRedirect();
          return;
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'Settings.sessions.revoke.success',
            defaultMessage: 'Session ended',
          }),
        });
      }
    );
  };

  const handleRevokeOthers = async () => {
    await runSessionMutation(
      () => revokeAllSessions({ keepCurrent: true }),
      () => {
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'Settings.sessions.revokeOthers.success',
            defaultMessage: 'Other sessions ended',
          }),
        });
      }
    );
  };

  const handleRevokeAll = async () => {
    await runSessionMutation(() => revokeAllSessions(undefined), handleLogoutAndRedirect);
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  if (error) {
    return <Page.Error />;
  }

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage({
          id: 'Settings.sessions.title',
          defaultMessage: 'Active Devices',
        })}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({
          id: 'Settings.sessions.title',
          defaultMessage: 'Active Devices',
        })}
        subtitle={formatMessage({
          id: 'Settings.sessions.subtitle',
          defaultMessage: 'These are the devices and sessions currently signed in to your account.',
        })}
        primaryAction={
          sessions.length > 0 ? (
            <Flex gap={2}>
              {sessions.length > 1 ? (
                <Dialog.Root>
                  <Dialog.Trigger>
                    <Button variant="secondary" startIcon={<SignOut />}>
                      {formatMessage({
                        id: 'Settings.sessions.revokeOthers',
                        defaultMessage: 'Log out of other devices',
                      })}
                    </Button>
                  </Dialog.Trigger>
                  <ConfirmDialog onConfirm={handleRevokeOthers}>
                    {formatMessage({
                      id: 'Settings.sessions.revokeOthers.confirm',
                      defaultMessage:
                        'Are you sure? This will end every other active session. You will stay signed in on this device.',
                    })}
                  </ConfirmDialog>
                </Dialog.Root>
              ) : null}
              <Dialog.Root>
                <Dialog.Trigger>
                  <Button variant="danger-light" startIcon={<SignOut />}>
                    {formatMessage({
                      id: 'Settings.sessions.revokeAll',
                      defaultMessage: 'Log out of all devices',
                    })}
                  </Button>
                </Dialog.Trigger>
                <ConfirmDialog onConfirm={handleRevokeAll}>
                  {formatMessage({
                    id: 'Settings.sessions.revokeAll.confirm',
                    defaultMessage:
                      'Are you sure? This will end every active session, including this one, and you will need to log in again.',
                  })}
                </ConfirmDialog>
              </Dialog.Root>
            </Flex>
          ) : undefined
        }
      />
      <Layouts.Content>
        <Box background="neutral0" hasRadius shadow="filterShadow">
          <Table colCount={4} rowCount={sessions.length}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: 'Settings.sessions.device', defaultMessage: 'Device' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: 'Settings.sessions.loginAt',
                      defaultMessage: 'Signed in',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: 'Settings.sessions.lastActiveAt',
                      defaultMessage: 'Last used',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: 'Settings.sessions.actions', defaultMessage: 'Actions' })}
                  </Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {sessions.map((session) => (
                <Tr key={session.id}>
                  <Td>
                    <Flex gap={2}>
                      <Typography textColor="neutral800">
                        {session.deviceName ??
                          (session.deviceId
                            ? session.deviceId.slice(0, 8)
                            : formatMessage({
                                id: 'Settings.sessions.unknownDevice',
                                defaultMessage: 'Unknown device',
                              }))}
                      </Typography>
                      {session.current && (
                        <Badge>
                          {formatMessage({
                            id: 'Settings.sessions.current',
                            defaultMessage: 'This device',
                          })}
                        </Badge>
                      )}
                    </Flex>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">
                      {session.loginAt ? (
                        <RelativeTime timestamp={new Date(session.loginAt)} />
                      ) : (
                        '-'
                      )}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">
                      {session.lastActiveAt ? (
                        <RelativeTime timestamp={new Date(session.lastActiveAt)} />
                      ) : (
                        '-'
                      )}
                    </Typography>
                  </Td>
                  <Td>
                    <Flex justifyContent="end" onClick={(e) => e.stopPropagation()}>
                      <Dialog.Root>
                        <Dialog.Trigger>
                          <IconButton
                            label={formatMessage({
                              id: 'Settings.sessions.revoke',
                              defaultMessage: 'End session',
                            })}
                            variant="ghost"
                          >
                            <SignOut />
                          </IconButton>
                        </Dialog.Trigger>
                        <ConfirmDialog onConfirm={() => handleRevoke(session)}>
                          {session.current
                            ? formatMessage({
                                id: 'Settings.sessions.revoke.confirmCurrent',
                                defaultMessage:
                                  'This is the device you are currently using. Ending this session will log you out.',
                              })
                            : formatMessage({
                                id: 'Settings.sessions.revoke.confirm',
                                defaultMessage:
                                  'Are you sure you want to end this session? The device will need to log in again.',
                              })}
                        </ConfirmDialog>
                      </Dialog.Root>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Layouts.Content>
    </Page.Main>
  );
};

export { SessionsPage };
