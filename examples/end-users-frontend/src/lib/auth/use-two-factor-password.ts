import { useAuth, useAuthPlugin, useListAccounts } from '@better-auth-ui/react';

import { twoFactorPlugin } from './two-factor-plugin';

/**
 * Whether two-factor management should ask for the account password.
 *
 * Better Auth's `allowPasswordless` option only waives the password for
 * accounts that have no credential account — a passkey-only user has no
 * password to type. Reading the linked accounts keeps the UI in step with
 * that rule instead of guessing from the option alone.
 */
export function useTwoFactorPasswordRequirement() {
  const { authClient } = useAuth();
  const { allowPasswordless } = useAuthPlugin(twoFactorPlugin);
  const { data: accounts, isPending } = useListAccounts(authClient);

  const hasCredentialAccount = accounts?.some((account) => account.providerId === 'credential');

  return {
    isPending: allowPasswordless && isPending,
    // Default to asking while the account list loads. Guessing "no password"
    // early would submit an empty body for a credential user and fail the
    // request; guessing "password" costs a passkey-only user nothing, because
    // the field disappears as soon as the list resolves.
    requiresPassword: !allowPasswordless || isPending || Boolean(hasCredentialAccount),
  };
}
