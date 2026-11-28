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
import { useMfaErrorMessage } from '../../hooks/useMfaErrorMessage';
import {
  useGetTrustedDevicesQuery,
  useRevokeAllTrustedDevicesMutation,
  useRevokeTrustedDeviceMutation,
} from '../../services/mfa';
import { MFA_DATE_TIME_FORMAT } from '../../utils/mfaDates';

import { ActionRow, ActionsTd, ActionsTh, MfaBlockHeader } from './MfaBlock';

import type { TrustedDevice } from '../../../../shared/contracts/mfa';

/**
 * The browsers this user has trusted to skip the second factor, inside the profile's
 * Two-factor section. The server decides everything shown here -- which row is the current
 * browser (by hashing the httpOnly trust cookie it sent), and each row's *effective* expiry --
 * so this component never reads a cookie or computes a date. Removing one row or all of them
 * asks first; a removed browser will be asked for a code at its next login, which the
 * confirmation says.
 */
const TrustedDevices = () => {
  const { formatMessage, formatDate } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useMfaErrorMessage();
  const { data: devices = [], isLoading, error } = useGetTrustedDevicesQuery();
  const [removeDevice] = useRevokeTrustedDeviceMutation();
  const [removeAll] = useRevokeAllTrustedDevicesMutation();

  // Keeps the error, empty and table states mutually exclusive: a stale, previously-successful
  // `devices` array must not render the table (or the Remove all button) underneath an error.
  const hasDevices = !error && devices.length > 0;

  const dateTime = (value: string) => formatDate(value, MFA_DATE_TIME_FORMAT);

  const deviceLabel = (device: TrustedDevice) =>
    device.deviceName ??
    formatMessage({ id: 'Settings.sessions.unknownDevice', defaultMessage: 'Unknown device' });

  const removeLabel = (device: TrustedDevice) =>
    formatMessage(
      {
        id: 'Settings.profile.form.section.mfa.trustedDevices.remove',
        defaultMessage: 'Remove {name}',
      },
      { name: deviceLabel(device) }
    );

  const handleRemove = async (device: TrustedDevice) => {
    const res = await removeDevice({ id: device.id });
    if ('error' in res) {
      toggleNotification({ type: 'danger', message: toMessage(res.error) });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.profile.form.section.mfa.trustedDevices.remove.success',
        defaultMessage: 'Trusted device removed.',
      }),
    });
  };

  const handleRemoveAll = async () => {
    const res = await removeAll();
    if ('error' in res) {
      toggleNotification({ type: 'danger', message: toMessage(res.error) });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.profile.form.section.mfa.trustedDevices.removeAll.success',
        defaultMessage: 'Trusted devices removed.',
      }),
    });
  };

  const removeAllLabel = formatMessage({
    id: 'Settings.profile.form.section.mfa.trustedDevices.removeAll',
    defaultMessage: 'Remove all',
  });

  if (isLoading) {
    return null;
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <MfaBlockHeader
        title={formatMessage({
          id: 'Settings.profile.form.section.mfa.trustedDevices.title',
          defaultMessage: 'Trusted devices',
        })}
        description={formatMessage({
          id: 'Settings.profile.form.section.mfa.trustedDevices.description',
          defaultMessage:
            'Browsers that skip the code at login. A browser is trusted when you check "Trust this device" after entering a code, until the date shown. Your password is still required every time.',
        })}
        action={
          hasDevices ? (
            <Dialog.Root>
              <Dialog.Trigger>
                <Button variant="danger-light">{removeAllLabel}</Button>
              </Dialog.Trigger>
              <ConfirmDialog
                title={removeAllLabel}
                endAction={
                  <Dialog.Action>
                    <Button fullWidth variant="danger-light" onClick={handleRemoveAll}>
                      {removeAllLabel}
                    </Button>
                  </Dialog.Action>
                }
              >
                {formatMessage({
                  id: 'Settings.profile.form.section.mfa.trustedDevices.removeAll.body',
                  defaultMessage:
                    'Every device will ask for a code at its next login. They stay logged in until then.',
                })}
              </ConfirmDialog>
            </Dialog.Root>
          ) : null
        }
      />
      {error ? <ErrorMessage error={toMessage(error)} /> : null}
      {!error && !hasDevices ? (
        <Typography textColor="neutral600">
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.trustedDevices.empty',
            defaultMessage:
              'No trusted devices. You can trust a browser the next time you enter a code.',
          })}
        </Typography>
      ) : null}
      {hasDevices ? (
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
              <ActionsTh>
                <Typography variant="sigma">
                  {formatMessage({ id: 'Settings.sessions.actions', defaultMessage: 'Actions' })}
                </Typography>
              </ActionsTh>
            </Tr>
          </Thead>
          <Tbody>
            {devices.map((device) => (
              <ActionRow key={device.id}>
                <Td>
                  <Flex gap={2}>
                    <Typography textColor="neutral800">{deviceLabel(device)}</Typography>
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
                <ActionsTd>
                  <Flex justifyContent="end" data-row-action>
                    <Dialog.Root>
                      <Dialog.Trigger>
                        <IconButton label={removeLabel(device)} variant="ghost">
                          <Trash />
                        </IconButton>
                      </Dialog.Trigger>
                      <ConfirmDialog
                        title={formatMessage({
                          id: 'Settings.profile.form.section.mfa.trustedDevices.remove.title',
                          defaultMessage: 'Remove trusted device?',
                        })}
                        endAction={
                          <Dialog.Action>
                            <Button
                              fullWidth
                              variant="danger-light"
                              onClick={() => handleRemove(device)}
                            >
                              {formatMessage({
                                id: 'Settings.profile.form.section.mfa.trustedDevices.remove.confirmButton',
                                defaultMessage: 'Remove',
                              })}
                            </Button>
                          </Dialog.Action>
                        }
                      >
                        {formatMessage(
                          {
                            id: 'Settings.profile.form.section.mfa.trustedDevices.remove.body',
                            defaultMessage:
                              '{name} will ask for a code at its next login. It stays logged in until then.',
                          },
                          { name: deviceLabel(device) }
                        )}
                      </ConfirmDialog>
                    </Dialog.Root>
                  </Flex>
                </ActionsTd>
              </ActionRow>
            ))}
          </Tbody>
        </Table>
      ) : null}
    </Flex>
  );
};

export { TrustedDevices };
