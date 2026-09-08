import * as React from 'react';

import {
  Badge,
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
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useNotification } from '../../features/Notifications';
import { useToMessage } from '../../hooks/useToMessage';
import {
  useGetTrustedDevicesQuery,
  useRevokeAllTrustedDevicesMutation,
  useRevokeTrustedDeviceMutation,
} from '../../services/mfa';

import type { TrustedDevice } from '../../../../shared/contracts/mfa';

/**
 * Cycle 3: the browsers this user has trusted to skip the second factor, inside the profile's
 * Two-factor section. The server decides everything shown here -- which row is the current
 * browser (by hashing the httpOnly trust cookie it sent), and each row's *effective* expiry --
 * so this component never reads a cookie or computes a date. Revoking one row or all of them
 * asks first; a revoked current browser will be asked for a code at its next login, which the
 * confirmation says.
 */
const TrustedDevices = () => {
  const { formatMessage, formatDate } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useToMessage();
  const { data: devices = [], isLoading, error } = useGetTrustedDevicesQuery();
  const [revokeDevice] = useRevokeTrustedDeviceMutation();
  const [revokeAll] = useRevokeAllTrustedDevicesMutation();

  const dateTime = (value: string) =>
    formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });

  const handleRevoke = async (device: TrustedDevice) => {
    const res = await revokeDevice({ id: device.id });
    if ('error' in res) {
      toggleNotification({ type: 'danger', message: toMessage(res.error) });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.profile.form.section.mfa.trustedDevices.revoke.success',
        defaultMessage: 'Device no longer trusted',
      }),
    });
  };

  const handleRevokeAll = async () => {
    const res = await revokeAll();
    if ('error' in res) {
      toggleNotification({ type: 'danger', message: toMessage(res.error) });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.profile.form.section.mfa.trustedDevices.revokeAll.success',
        defaultMessage: 'No device is trusted any more',
      }),
    });
  };

  if (isLoading) {
    return null;
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
        <Typography variant="delta" tag="h3">
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.trustedDevices.title',
            defaultMessage: 'Trusted devices',
          })}
        </Typography>
        {devices.length > 0 ? (
          <Dialog.Root>
            <Dialog.Trigger>
              <Button variant="danger-light">
                {formatMessage({
                  id: 'Settings.profile.form.section.mfa.trustedDevices.revokeAll',
                  defaultMessage: 'Revoke all',
                })}
              </Button>
            </Dialog.Trigger>
            <ConfirmDialog
              title={formatMessage({
                id: 'Settings.profile.form.section.mfa.trustedDevices.revokeAll.title',
                defaultMessage: 'Revoke every trusted device?',
              })}
              onConfirm={handleRevokeAll}
            >
              {formatMessage({
                id: 'Settings.profile.form.section.mfa.trustedDevices.revokeAll.body',
                defaultMessage:
                  'Every browser, including this one, will ask for a code at its next login.',
              })}
            </ConfirmDialog>
          </Dialog.Root>
        ) : null}
      </Flex>
      <Typography variant="pi" textColor="neutral600">
        {formatMessage({
          id: 'Settings.profile.form.section.mfa.trustedDevices.description',
          defaultMessage:
            'Browsers that skip the code at login. A browser is trusted when you tick "Trust this device" after entering a code, until the date shown. Your password is still required every time.',
        })}
      </Typography>
      {error ? <ErrorMessage error={toMessage(error)} /> : null}
      {!error && devices.length === 0 ? (
        <Typography textColor="neutral600">
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.trustedDevices.empty',
            defaultMessage:
              'No trusted devices. You can trust a browser the next time you enter a code.',
          })}
        </Typography>
      ) : null}
      {devices.length > 0 ? (
        <Table colCount={5} rowCount={devices.length}>
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
                    id: 'Settings.profile.form.section.mfa.trustedDevices.since',
                    defaultMessage: 'Trusted since',
                  })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.trustedDevices.expires',
                    defaultMessage: 'Expires',
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
            {devices.map((device) => (
              <Tr key={device.id}>
                <Td>
                  <Flex gap={2}>
                    <Typography textColor="neutral800">
                      {device.deviceName ??
                        formatMessage({
                          id: 'Settings.sessions.unknownDevice',
                          defaultMessage: 'Unknown device',
                        })}
                    </Typography>
                    {device.current ? (
                      <Badge>
                        {formatMessage({
                          id: 'Settings.sessions.current',
                          defaultMessage: 'This device',
                        })}
                      </Badge>
                    ) : null}
                  </Flex>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{dateTime(device.createdAt)}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{dateTime(device.expiresAt)}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">
                    {device.lastUsedAt
                      ? dateTime(device.lastUsedAt)
                      : formatMessage({
                          id: 'Settings.profile.form.section.mfa.trustedDevices.neverUsed',
                          defaultMessage: 'Not yet',
                        })}
                  </Typography>
                </Td>
                <Td>
                  <Flex justifyContent="end">
                    <Dialog.Root>
                      <Dialog.Trigger>
                        <IconButton
                          label={formatMessage({
                            id: 'Settings.profile.form.section.mfa.trustedDevices.revoke',
                            defaultMessage: 'Revoke trust',
                          })}
                          variant="ghost"
                        >
                          <Trash />
                        </IconButton>
                      </Dialog.Trigger>
                      <ConfirmDialog
                        title={formatMessage({
                          id: 'Settings.profile.form.section.mfa.trustedDevices.revoke.title',
                          defaultMessage: 'Revoke this device?',
                        })}
                        onConfirm={() => handleRevoke(device)}
                      >
                        {device.current
                          ? formatMessage({
                              id: 'Settings.profile.form.section.mfa.trustedDevices.revoke.confirmCurrent',
                              defaultMessage:
                                'This browser will ask for a code at your next login.',
                            })
                          : formatMessage({
                              id: 'Settings.profile.form.section.mfa.trustedDevices.revoke.confirm',
                              defaultMessage: 'That browser will ask for a code at its next login.',
                            })}
                      </ConfirmDialog>
                    </Dialog.Root>
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : null}
    </Flex>
  );
};

export { TrustedDevices };
