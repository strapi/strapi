import * as React from 'react';

import { ConfirmDialog, useRBAC } from '@strapi/admin/strapi-admin';
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  LinkButton,
  Loader,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import {
  useBanUserMutation,
  useGetUserProfileQuery,
  useGetUserSecurityQuery,
  useResetUserTwoFactorMutation,
  useRevokeUserSessionMutation,
  useRevokeUserSessionsMutation,
  useSendUserPasswordResetMutation,
  useSendUserVerificationMutation,
  useUnbanUserMutation,
  useUnlinkUserAccountMutation,
  useUnlockUserMutation,
} from '../../services/userSecurity';
import { getTranslation } from '../../utils/getTranslation';
import { EffectivePermissionsModal } from '../EffectivePermissions/EffectivePermissionsModal';

import { BanModal } from './BanModal';
import { SessionsModal } from './SessionsModal';
import { isForbidden, useSecurityActions } from './useSecurityActions';

import type { UserSecurity } from '../../../../shared/contracts/user-security';

const USER_UID = 'plugin::end-users.user';
const PROFILE_UID = 'plugin::end-users.profile';

const CAN_UPDATE = [{ action: 'plugin::content-manager.explorer.update', subject: USER_UID }];

/** What the Content Manager gives a side panel: only what this one reads */
interface SecurityPanelProps {
  model: string;
  documentId?: string;
  document?: { documentId?: string; emailVerified?: boolean };
}

interface RowProps {
  label: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

/** One line of the panel: what it is, what it holds and the buttons that change it */
const Row = ({ label, children, actions }: RowProps) => (
  <Flex direction="column" alignItems="stretch" gap={1}>
    <Typography variant="sigma" textColor="neutral600">
      {label}
    </Typography>
    <Flex direction="column" alignItems="flex-start" gap={1}>
      {children}
    </Flex>
    {actions && (
      <Flex gap={2} wrap="wrap" paddingTop={1}>
        {actions}
      </Flex>
    )}
  </Flex>
);

const SecurityContent = ({
  documentId,
  emailVerified,
}: {
  documentId: string;
  /** The saved email is verified: there is nothing to resend */
  emailVerified: boolean;
}) => {
  const { formatMessage, formatDate } = useIntl();
  const {
    allowedActions: { canUpdate },
  } = useRBAC(CAN_UPDATE);

  const { data, isLoading, error } = useGetUserSecurityQuery(documentId);
  const { data: profileId } = useGetUserProfileQuery(documentId);

  const [revokeSession] = useRevokeUserSessionMutation();
  const [revokeSessions] = useRevokeUserSessionsMutation();
  const [unlinkAccount] = useUnlinkUserAccountMutation();
  const [ban] = useBanUserMutation();
  const [unban] = useUnbanUserMutation();
  const [unlock] = useUnlockUserMutation();
  const [resetTwoFactor] = useResetUserTwoFactorMutation();
  const [sendPasswordReset] = useSendUserPasswordResetMutation();
  const [sendVerification] = useSendUserVerificationMutation();

  const { forbidden, confirmation, setConfirmation, sending, perform, sendEmail, confirm } =
    useSecurityActions();
  const [sessionsOpen, setSessionsOpen] = React.useState(false);
  const [banOpen, setBanOpen] = React.useState(false);
  const [permissionsOpen, setPermissionsOpen] = React.useState(false);

  const readForbidden = isForbidden(error);
  const canAct = canUpdate && !forbidden && !readForbidden;

  if (isLoading) {
    return (
      <Loader small>{formatMessage({ id: 'app.utils.loading', defaultMessage: 'Loading' })}</Loader>
    );
  }

  if (readForbidden) {
    return (
      <Typography textColor="neutral600">
        {formatMessage({
          id: getTranslation('security-panel.forbidden'),
          defaultMessage:
            'Your role can read only some fields of end users, so it cannot see their security.',
        })}
      </Typography>
    );
  }

  if (!data) {
    return (
      <Typography textColor="danger600">
        {formatMessage({
          id: getTranslation('security-panel.error'),
          defaultMessage: "This user's security could not be read.",
        })}
      </Typography>
    );
  }

  const security: UserSecurity = data;
  const { accounts, sessions, status } = security;
  const locked = status.lockedUntil !== null && new Date(status.lockedUntil).getTime() > Date.now();
  // A ban with no end date holds, and so does one whose end date is still ahead. The server refuses
  // the reset for the same user, since no reset mail goes to a banned address
  const banInForce =
    status.banned &&
    (status.banExpires === null || new Date(status.banExpires).getTime() > Date.now());
  const when = (value: string) => formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });

  const accountLabel = (providerId: string) =>
    providerId === 'credential'
      ? formatMessage({
          id: getTranslation('security-panel.methods.credential'),
          defaultMessage: 'Email and password',
        })
      : providerId;

  const sessionsLabel = formatMessage(
    {
      id: getTranslation('security-panel.sessions.count'),
      defaultMessage: '{count, plural, =0 {No sessions} one {# session} other {# sessions}}',
    },
    { count: sessions.length }
  );

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {!canAct && (
        <Typography variant="pi" textColor="neutral600">
          {forbidden
            ? formatMessage({
                id: getTranslation('security-panel.read-only-fields'),
                defaultMessage:
                  'Your role is limited to some fields of end users, so these cannot be changed from here.',
              })
            : formatMessage({
                id: getTranslation('security-panel.read-only'),
                defaultMessage: 'You can look at these, but not change them.',
              })}
        </Typography>
      )}

      <Row
        label={formatMessage({
          id: getTranslation('security-panel.methods'),
          defaultMessage: 'Sign-in methods',
        })}
      >
        {accounts.length === 0 && security.passkeys === 0 && (
          <Typography>
            {formatMessage({
              id: getTranslation('security-panel.methods.none'),
              defaultMessage: 'None',
            })}
          </Typography>
        )}
        {accounts.map((account) => (
          <Flex
            key={account.id}
            justifyContent="space-between"
            alignItems="center"
            gap={2}
            width="100%"
          >
            <Typography>{accountLabel(account.providerId)}</Typography>
            {canAct && accounts.length > 1 && (
              <Button
                variant="danger-light"
                size="S"
                onClick={() =>
                  confirm(
                    formatMessage(
                      {
                        id: getTranslation('security-panel.methods.unlink-question'),
                        defaultMessage:
                          'Unlink {method} from this user? They can no longer sign in with it.',
                      },
                      { method: accountLabel(account.providerId) }
                    ),
                    () =>
                      perform(
                        unlinkAccount({ documentId, accountId: account.id }),
                        formatMessage({
                          id: getTranslation('security-panel.methods.unlinked'),
                          defaultMessage: 'Sign-in method unlinked.',
                        })
                      )
                  )
                }
              >
                {formatMessage({
                  id: getTranslation('security-panel.methods.unlink'),
                  defaultMessage: 'Unlink',
                })}
              </Button>
            )}
          </Flex>
        ))}
        {security.passkeys > 0 && (
          <Typography>
            {formatMessage(
              {
                id: getTranslation('security-panel.methods.passkeys'),
                defaultMessage: '{count, plural, one {# passkey} other {# passkeys}}',
              },
              { count: security.passkeys }
            )}
          </Typography>
        )}
      </Row>

      <Row
        label={formatMessage({
          id: getTranslation('security-panel.two-factor'),
          defaultMessage: 'Two-factor',
        })}
        actions={
          canAct &&
          security.twoFactor && (
            <Button
              variant="danger-light"
              size="S"
              onClick={() =>
                confirm(
                  formatMessage({
                    id: getTranslation('security-panel.two-factor.reset-question'),
                    defaultMessage:
                      'Reset two-factor for this user? They can sign in without a second step until they set it up again.',
                  }),
                  () =>
                    perform(
                      resetTwoFactor(documentId),
                      formatMessage({
                        id: getTranslation('security-panel.two-factor.reset-done'),
                        defaultMessage: 'Two-factor reset.',
                      })
                    )
                )
              }
            >
              {formatMessage({
                id: getTranslation('security-panel.two-factor.reset'),
                defaultMessage: 'Reset',
              })}
            </Button>
          )
        }
      >
        <Typography>
          {security.twoFactor
            ? formatMessage({
                id: getTranslation('security-panel.two-factor.on'),
                defaultMessage: 'On',
              })
            : formatMessage({
                id: getTranslation('security-panel.two-factor.off'),
                defaultMessage: 'Off',
              })}
        </Typography>
      </Row>

      <Row
        label={formatMessage({
          id: getTranslation('security-panel.sessions'),
          defaultMessage: 'Sessions',
        })}
        actions={
          <>
            <Button variant="tertiary" size="S" onClick={() => setSessionsOpen(true)}>
              {formatMessage({
                id: getTranslation('security-panel.sessions.view'),
                defaultMessage: 'View',
              })}
            </Button>
            {canAct && sessions.length > 0 && (
              <Button
                variant="danger-light"
                size="S"
                onClick={() =>
                  confirm(
                    formatMessage({
                      id: getTranslation('security-panel.sessions.sign-out-all-question'),
                      defaultMessage: 'Sign this user out everywhere?',
                    }),
                    () =>
                      perform(
                        revokeSessions(documentId),
                        formatMessage({
                          id: getTranslation('security-panel.sessions.signed-out-all'),
                          defaultMessage: 'Signed out everywhere.',
                        })
                      )
                  )
                }
              >
                {formatMessage({
                  id: getTranslation('security-panel.sessions.sign-out-all'),
                  defaultMessage: 'Sign out all',
                })}
              </Button>
            )}
          </>
        }
      >
        <Typography>{sessionsLabel}</Typography>
      </Row>

      <Row
        label={formatMessage({
          id: getTranslation('security-panel.status'),
          defaultMessage: 'Status',
        })}
        actions={
          canAct && (
            <>
              {status.banned ? (
                <Button
                  variant="tertiary"
                  size="S"
                  onClick={() =>
                    perform(
                      unban(documentId),
                      formatMessage({
                        id: getTranslation('security-panel.status.unbanned'),
                        defaultMessage: 'User unbanned.',
                      })
                    )
                  }
                >
                  {formatMessage({
                    id: getTranslation('security-panel.status.unban'),
                    defaultMessage: 'Unban',
                  })}
                </Button>
              ) : (
                <Button variant="danger-light" size="S" onClick={() => setBanOpen(true)}>
                  {formatMessage({
                    id: getTranslation('security-panel.status.ban'),
                    defaultMessage: 'Ban',
                  })}
                </Button>
              )}
              {locked && (
                <Button
                  variant="tertiary"
                  size="S"
                  onClick={() =>
                    perform(
                      unlock(documentId),
                      formatMessage({
                        id: getTranslation('security-panel.status.unlocked'),
                        defaultMessage: 'User unlocked.',
                      })
                    )
                  }
                >
                  {formatMessage({
                    id: getTranslation('security-panel.status.unlock'),
                    defaultMessage: 'Unlock',
                  })}
                </Button>
              )}
            </>
          )
        }
      >
        {status.banned ? (
          <>
            <Badge>
              {formatMessage({
                id: getTranslation('security-panel.status.banned'),
                defaultMessage: 'Banned',
              })}
            </Badge>
            {status.banReason && <Typography variant="pi">{status.banReason}</Typography>}
            <Typography variant="pi" textColor="neutral600">
              {status.banExpires
                ? formatMessage(
                    {
                      id: getTranslation('security-panel.status.until'),
                      defaultMessage: 'Until {date}',
                    },
                    { date: when(status.banExpires) }
                  )
                : formatMessage({
                    id: getTranslation('security-panel.status.no-end'),
                    defaultMessage: 'Until an administrator lifts it',
                  })}
            </Typography>
          </>
        ) : locked && status.lockedUntil ? (
          <>
            <Badge>
              {formatMessage({
                id: getTranslation('security-panel.status.locked'),
                defaultMessage: 'Locked',
              })}
            </Badge>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage(
                {
                  id: getTranslation('security-panel.status.until'),
                  defaultMessage: 'Until {date}',
                },
                { date: when(status.lockedUntil) }
              )}
            </Typography>
          </>
        ) : (
          <Badge>
            {formatMessage({
              id: getTranslation('security-panel.status.active'),
              defaultMessage: 'Active',
            })}
          </Badge>
        )}
      </Row>

      {canAct && (
        <Row
          label={formatMessage({
            id: getTranslation('security-panel.emails'),
            defaultMessage: 'Emails',
          })}
        >
          <Flex gap={2} wrap="wrap">
            <Button
              variant="tertiary"
              size="S"
              loading={sending === 'reset'}
              disabled={sending !== null || banInForce}
              onClick={() =>
                sendEmail(
                  'reset',
                  () => sendPasswordReset(documentId),
                  formatMessage({
                    id: getTranslation('security-panel.emails.reset-sent'),
                    defaultMessage: 'Password reset email sent.',
                  })
                )
              }
            >
              {formatMessage({
                id: getTranslation('security-panel.emails.reset'),
                defaultMessage: 'Send password reset',
              })}
            </Button>
            {banInForce && (
              <Typography variant="pi" textColor="neutral600">
                {formatMessage({
                  id: getTranslation('security-panel.emails.reset-banned'),
                  defaultMessage: 'This user is banned. Unban them to send a password reset.',
                })}
              </Typography>
            )}
            {!emailVerified && (
              <Button
                variant="tertiary"
                size="S"
                loading={sending === 'verification'}
                disabled={sending !== null}
                onClick={() =>
                  sendEmail(
                    'verification',
                    () => sendVerification(documentId),
                    formatMessage({
                      id: getTranslation('security-panel.emails.verification-sent'),
                      defaultMessage: 'Verification email sent.',
                    })
                  )
                }
              >
                {formatMessage({
                  id: getTranslation('security-panel.emails.verification'),
                  defaultMessage: 'Resend verification',
                })}
              </Button>
            )}
          </Flex>
        </Row>
      )}

      <Row
        label={formatMessage({
          id: getTranslation('security-panel.profile'),
          defaultMessage: 'Profile',
        })}
      >
        {profileId ? (
          <LinkButton
            tag={Link}
            variant="tertiary"
            size="S"
            to={`/content-manager/collection-types/${PROFILE_UID}/${profileId}`}
          >
            {formatMessage({
              id: getTranslation('security-panel.profile.open'),
              defaultMessage: 'Open profile',
            })}
          </LinkButton>
        ) : (
          <Button variant="tertiary" size="S" disabled>
            {formatMessage({
              id: getTranslation('security-panel.profile.open'),
              defaultMessage: 'Open profile',
            })}
          </Button>
        )}
      </Row>

      <Row
        label={formatMessage({
          id: getTranslation('security-panel.permissions'),
          defaultMessage: 'Permissions',
        })}
      >
        <Button variant="tertiary" size="S" onClick={() => setPermissionsOpen(true)}>
          {formatMessage({
            id: getTranslation('security-panel.permissions.effective'),
            defaultMessage: 'Effective permissions',
          })}
        </Button>
      </Row>

      <SessionsModal
        open={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        sessions={sessions}
        canSignOut={canAct}
        onSignOut={(session) =>
          confirm(
            formatMessage({
              id: getTranslation('security-panel.sessions.sign-out-question'),
              defaultMessage: 'Sign this session out?',
            }),
            () =>
              perform(
                revokeSession({ documentId, sessionId: session.id }),
                formatMessage({
                  id: getTranslation('security-panel.sessions.signed-out'),
                  defaultMessage: 'Session signed out.',
                })
              )
          )
        }
      />
      <BanModal
        open={banOpen}
        onClose={() => setBanOpen(false)}
        onBan={(body) =>
          perform(
            ban({ documentId, ...body }),
            formatMessage({
              id: getTranslation('security-panel.status.banned-done'),
              defaultMessage: 'User banned.',
            })
          )
        }
      />
      <EffectivePermissionsModal
        documentId={documentId}
        open={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
      />

      <Dialog.Root
        open={confirmation !== null}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        {confirmation && (
          <ConfirmDialog
            onConfirm={async () => {
              await confirmation.run();
            }}
          >
            <Box>
              <Typography>{confirmation.message}</Typography>
            </Box>
          </ConfirmDialog>
        )}
      </Dialog.Root>
    </Flex>
  );
};

/**
 * The Security panel of an end user's edit view in the Content Manager. It shows only for the
 * end-user type, and once the user is saved: a new user has no security yet.
 */
const SecurityPanel = ({ model, documentId, document }: SecurityPanelProps) => {
  const { formatMessage } = useIntl();

  if (model !== USER_UID || !documentId || !document?.documentId) {
    return null;
  }

  return {
    title: formatMessage({
      id: getTranslation('security-panel.title'),
      defaultMessage: 'Security',
    }),
    content: (
      <SecurityContent documentId={documentId} emailVerified={document.emailVerified === true} />
    ),
  };
};

export { SecurityPanel };
export type { SecurityPanelProps };
