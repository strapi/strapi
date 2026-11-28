import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { DowngradeCredentials } from '../../Security/components/ConfirmDowngradeDialog';

/**
 * Runs one re-authenticated action on another user. Resolves a message to show in the dialog when
 * it failed, or nothing when it worked (after calling `onSuccess`).
 */
const runWithCredentials = async (
  action: (credentials: DowngradeCredentials | Record<string, never>) => Promise<unknown>,
  credentials: DowngradeCredentials | undefined,
  onSuccess: () => void,
  toMessage: (error: never) => string
): Promise<string | undefined> => {
  const res = (await action(credentials ?? {})) as { error?: unknown };
  if (res && 'error' in res && res.error) {
    return toMessage(res.error as never);
  }
  onSuccess();
  return undefined;
};

/** The body of a dialog that lowers another user's protection: what it does, and why we ask. */
const ReauthDescription = ({ body }: { body: string }) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography>{body}</Typography>
      <Typography textColor="neutral600">
        {formatMessage({
          id: 'Settings.permissions.users.mfa.reauth.description',
          defaultMessage: "This lowers another user's protection, so confirm it is you.",
        })}
      </Typography>
    </Flex>
  );
};

export { runWithCredentials, ReauthDescription };
