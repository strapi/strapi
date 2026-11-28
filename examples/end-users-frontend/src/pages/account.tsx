import { useAuth, useAuthenticate } from '@better-auth-ui/react';

import { UserProfile } from '@/components/auth/settings/account/user-profile';
import { ActiveSessions } from '@/components/auth/settings/security/active-sessions';
import { ChangePassword } from '@/components/auth/settings/security/change-password';
import { TwoFactorSettings } from '@/components/auth/two-factor/two-factor-settings';
import { ProfileCard } from '@/components/profile-card';
import { AUTH_MODE } from '@/lib/auth-client';

/**
 * What Better Auth UI's settings screens offer, minus what the end-users plugin does not turn on,
 * and the profile card, which is Strapi's own (`GET` and `PUT /api/users/me/profile`).
 * Signed-out visitors are sent to /sign-in and come back here.
 */
export function AccountPage() {
  const { authClient } = useAuth();
  const { data: session } = useAuthenticate(authClient);

  if (!session) {
    return null;
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Your account</h1>
      <UserProfile />
      <ProfileCard userId={session.user.id} />
      <ChangePassword />
      <ActiveSessions />
      {AUTH_MODE === 'cookie' && <TwoFactorSettings />}
    </>
  );
}
