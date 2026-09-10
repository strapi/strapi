import * as React from 'react';

import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import {
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
import { useDeletePasskeyMutation, useGetPasskeysQuery } from '../../services/mfa';

import { AddPasskeyDialog } from './AddPasskeyDialog';

import type { Passkey } from '../../../../shared/contracts/mfa';

/**
 * Cycle 4: the WebAuthn credentials this user can sign in with instead of typing a code, inside
 * the profile's Two-factor section. `TwoFactorSection` renders this only for an enrolled account
 * while the organisation allows passkeys, so nothing here re-checks either.
 *
 * Only four fields ever reach the client (`shared/contracts/mfa.ts` `Passkey`), and there is no
 * rename: the name is captured once in `AddPasskeyDialog`. Removing a passkey costs nothing --
 * the authenticator app always survives it, so there is no lockout path and no re-authentication.
 *
 * `browserSupportsWebAuthn()` gates the Add button only. Existing rows stay listed and removable
 * in a browser that cannot run a ceremony: a user who registered a passkey elsewhere must still
 * be able to take it away from here.
 */
const Passkeys = () => {
  const { formatMessage, formatDate } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useToMessage();
  const { data: passkeys = [], isLoading, error } = useGetPasskeysQuery();
  const [deletePasskey] = useDeletePasskeyMutation();
  const [addOpen, setAddOpen] = React.useState(false);

  // Keeps the error, empty and table states mutually exclusive: a stale, previously-successful
  // array must not render the table underneath an error (cycle 3's correction to this pattern).
  const hasPasskeys = !error && passkeys.length > 0;
  const supported = browserSupportsWebAuthn();

  const dateTime = (value: string) =>
    formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });

  const handleDelete = async (passkey: Passkey) => {
    const res = await deletePasskey({ id: passkey.id });
    if ('error' in res) {
      toggleNotification({ type: 'danger', message: toMessage(res.error) });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.profile.form.section.mfa.passkeys.delete.success',
        defaultMessage: 'Passkey removed',
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
            id: 'Settings.profile.form.section.mfa.passkeys.title',
            defaultMessage: 'Passkeys',
          })}
        </Typography>
        {supported ? (
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            {formatMessage({
              id: 'Settings.profile.form.section.mfa.passkeys.add',
              defaultMessage: 'Add a passkey',
            })}
          </Button>
        ) : (
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: 'Settings.profile.form.section.mfa.passkeys.unsupported',
              defaultMessage: 'This browser does not support passkeys.',
            })}
          </Typography>
        )}
      </Flex>
      <Typography variant="pi" textColor="neutral600">
        {formatMessage({
          id: 'Settings.profile.form.section.mfa.passkeys.description',
          defaultMessage:
            'A passkey signs you in with your device instead of a code, and cannot be used on a look-alike site. Your password is still required every time.',
        })}
      </Typography>
      {error ? <ErrorMessage error={toMessage(error)} /> : null}
      {!error && !hasPasskeys ? (
        <Typography textColor="neutral600">
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.passkeys.empty',
            defaultMessage: 'No passkeys. Add one to sign in with your device instead of a code.',
          })}
        </Typography>
      ) : null}
      {hasPasskeys ? (
        <Table colCount={4} rowCount={passkeys.length}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.passkeys.name',
                    defaultMessage: 'Name',
                  })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.passkeys.added',
                    defaultMessage: 'Added',
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
            {passkeys.map((passkey) => (
              <Tr key={passkey.id}>
                <Td>
                  <Typography textColor="neutral800">{passkey.name}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{dateTime(passkey.createdAt)}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">
                    {passkey.lastUsedAt
                      ? dateTime(passkey.lastUsedAt)
                      : formatMessage({
                          id: 'Settings.profile.form.section.mfa.passkeys.neverUsed',
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
                            id: 'Settings.profile.form.section.mfa.passkeys.delete',
                            defaultMessage: 'Remove passkey',
                          })}
                          variant="ghost"
                        >
                          <Trash />
                        </IconButton>
                      </Dialog.Trigger>
                      <ConfirmDialog
                        title={formatMessage({
                          id: 'Settings.profile.form.section.mfa.passkeys.delete.title',
                          defaultMessage: 'Remove this passkey?',
                        })}
                        onConfirm={() => handleDelete(passkey)}
                      >
                        {formatMessage({
                          id: 'Settings.profile.form.section.mfa.passkeys.delete.body',
                          defaultMessage:
                            'That device will no longer sign you in. You can still use a code from your authenticator app.',
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
      <AddPasskeyDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Flex>
  );
};

export { Passkeys };
